import {
  AutoProcessor,
  EdgeTamModel,
  type PretrainedModelOptions,
  RawImage,
  type Sam2Processor,
  Tensor,
} from '@huggingface/transformers'

import { type Box, MODEL, type Point } from './common'

export type Request =
  | { type: 'load' }
  | {
      type: 'encode'
      id: number
      data: Uint8ClampedArray
      width: number
      height: number
    }
  | { type: 'decode'; id: number; points: Point[]; box: Box | null }

export type Reply =
  | { type: 'progress'; value: number }
  | { type: 'ready' }
  | { type: 'encoded'; id: number }
  | { type: 'mask'; id: number; mask: Uint8Array }
  | { type: 'error'; message: string }

type GPU = { requestAdapter(): Promise<{ features: Set<string> } | null> }

let model: EdgeTamModel
let processor: Sam2Processor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let inputs: any
let embeddings: Record<string, Tensor>

const post = (reply: Reply) => (self as unknown as Worker).postMessage(reply)

async function load() {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
  const adapter = await gpu?.requestAdapter()
  const device = adapter ? 'webgpu' : 'wasm'
  const dtype = !adapter
    ? 'q8'
    : adapter.features.has('shader-f16')
      ? 'fp16'
      : 'fp32'

  const files: Record<string, [number, number]> = {}
  const progress_callback: PretrainedModelOptions['progress_callback'] = (
    p,
  ) => {
    if (p.status !== 'progress') return
    files[p.file] = [p.loaded, p.total]
    const all = Object.values(files)
    post({
      type: 'progress',
      value:
        all.reduce((s, [l]) => s + l, 0) / all.reduce((s, [, t]) => s + t, 0),
    })
  }

  ;[model, processor] = await Promise.all([
    EdgeTamModel.from_pretrained(MODEL, {
      device,
      dtype,
      progress_callback,
    }) as Promise<EdgeTamModel>,
    AutoProcessor.from_pretrained(MODEL, {
      progress_callback,
    }) as Promise<Sam2Processor>,
  ])
  post({ type: 'ready' })
}

async function handle(req: Request) {
  if (req.type === 'load') return load()

  if (req.type === 'encode') {
    inputs = await processor(
      new RawImage(req.data, req.width, req.height, 4).rgb(),
    )
    embeddings = await model.get_image_embeddings(inputs)
    return post({ type: 'encoded', id: req.id })
  }

  const [h, w] = inputs.reshaped_input_sizes[0]
  const [height, width] = inputs.original_sizes[0]
  // Prompts arrive in screen pixels; the model wants its resized input's.
  const sx = w / width
  const sy = h / height
  const n = req.points.length
  const prompt: Record<string, Tensor> = {}
  if (n) {
    prompt.input_points = new Tensor(
      'float32',
      req.points.flatMap((p) => [p.x * sx, p.y * sy]),
      [1, 1, n, 2],
    )
    prompt.input_labels = new Tensor(
      'int64',
      BigInt64Array.from(req.points, (p) => BigInt(+p.positive)),
      [1, 1, n],
    )
  }
  if (req.box) {
    const [x0, y0, x1, y1] = req.box
    prompt.input_boxes = new Tensor(
      'float32',
      [x0 * sx, y0 * sy, x1 * sx, y1 * sy],
      [1, 1, 4],
    )
  }

  const { pred_masks, iou_scores } = await model({ ...embeddings, ...prompt })
  const [masks] = await processor.post_process_masks(
    pred_masks,
    inputs.original_sizes,
    inputs.reshaped_input_sizes,
  )

  // Three candidates, tuned for ambiguous single clicks; they can ignore
  // exclusions. Prefer the one that honors the most prompts, then confidence.
  const scores = iou_scores.data as Float32Array
  const size = width * height
  const data = masks.data as Uint8Array
  const fit = (i: number) =>
    req.points.filter(
      (p) =>
        !!data[i * size + Math.round(p.y) * width + Math.round(p.x)] ===
        p.positive,
    ).length + scores[i]
  const best = [...scores.keys()].reduce((a, b) => (fit(b) > fit(a) ? b : a))
  const mask = data.slice(best * size, (best + 1) * size)
  post({ type: 'mask', id: req.id, mask })
}

// One message at a time, so a decode always sees the encode sent before it.
let queue = Promise.resolve()
self.onmessage = ({ data }: MessageEvent<Request>) => {
  queue = queue
    .then(() => handle(data))
    .catch((e) => post({ type: 'error', message: String(e) }))
}
