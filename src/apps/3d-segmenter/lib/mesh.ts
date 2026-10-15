import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type InterleavedBufferAttribute,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  type Object3D,
  SRGBColorSpace,
  type Texture,
} from 'three'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js'

import { createTexture } from 'src/lib/graphics'

import type { Cls, Part } from './common'

export const matcap = createTexture((canvas, ctx) => {
  canvas.width = canvas.height = 256
  const g = ctx.createRadialGradient(96, 80, 8, 128, 128, 160)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.55, '#b4afa8')
  g.addColorStop(1, '#2b2927')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
})
matcap.colorSpace = SRGBColorSpace

export const CLAY = new MeshMatcapMaterial({ matcap, color: '#d9d4cc' })

/** Labels draw over the model; unlabeled vertices are fully transparent. */
export const OVERLAY = new MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
})

export const WIRE = new MeshBasicMaterial({
  wireframe: true,
  color: '#000000',
  transparent: true,
  opacity: 0.2,
})

export const data = {
  geometry: null as BufferGeometry | null,
  /** One textured material per part, matching the geometry's groups. */
  materials: [] as Material[],
  parts: [] as Part[],
  /** Class id per vertex, -1 when unlabeled. */
  labels: new Int32Array(0),
  center: [0, 0, 0],
  scale: 1,
}

const DRACO = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'

async function load(name: string, buffer: ArrayBuffer): Promise<Object3D> {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'glb' || ext === 'gltf') {
    const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] =
      await Promise.all([
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/loaders/DRACOLoader.js'),
        import('three/addons/libs/meshopt_decoder.module.js'),
      ])
    // Compressed geometry: meshopt decodes locally, Draco fetches its decoder on demand.
    const draco = new DRACOLoader().setDecoderPath(DRACO)
    const loader = new GLTFLoader()
      .setDRACOLoader(draco)
      .setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader
      .parseAsync(buffer, '')
      .finally(() => draco.dispose())
    return gltf.scene
  }
  if (ext === 'obj') {
    const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
    return new OBJLoader().parse(new TextDecoder().decode(buffer))
  }
  if (ext === 'ply') {
    const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js')
    return new Mesh(new PLYLoader().parse(buffer))
  }
  if (ext === 'stl') {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js')
    return new Mesh(new STLLoader().parse(buffer))
  }
  throw new Error(`Unsupported mesh: ${name}`)
}

/** Plain float copy: quantized, normalized or interleaved attributes can't be merged. */
function float(a: BufferAttribute | InterleavedBufferAttribute) {
  const out = new Float32Array(a.count * a.itemSize)
  for (let i = 0; i < a.count; i++)
    for (let k = 0; k < a.itemSize; k++)
      out[i * a.itemSize + k] = a.getComponent(i, k)
  return new BufferAttribute(out, a.itemSize)
}

/** Keeps only what we render, so every part merges into one geometry. */
function clean(mesh: Mesh) {
  let g = new BufferGeometry()
  for (const key of ['position', 'normal', 'uv'])
    if (mesh.geometry.getAttribute(key))
      g.setAttribute(key, float(mesh.geometry.getAttribute(key)))
  if (mesh.geometry.index) g.setIndex(Array.from(mesh.geometry.index.array))
  if (!g.index) g = mergeVertices(g)
  const count = g.getAttribute('position').count
  if (!g.getAttribute('uv'))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(count * 2), 2))
  if (!g.getAttribute('normal')) g.computeVertexNormals()
  return g.applyMatrix4(mesh.matrixWorld)
}

function material(source: Material | Material[]) {
  const m = (Array.isArray(source) ? source[0] : source) as Material & {
    map?: Texture | null
    color?: Color
  }
  return new MeshMatcapMaterial({ matcap, map: m.map ?? null, color: m.color })
}

export async function parse(name: string, buffer: ArrayBuffer) {
  const root = await load(name, buffer)
  root.updateMatrixWorld(true)

  const meshes: Mesh[] = []
  root.traverse((o) => (o as Mesh).isMesh && meshes.push(o as Mesh))
  if (!meshes.length) throw new Error(`No meshes in ${name}`)

  const pieces = meshes.map(clean)
  const geometry = mergeGeometries(pieces, true)
  geometry.computeBoundingSphere()
  const { center, radius } = geometry.boundingSphere!
  geometry.translate(-center.x, -center.y, -center.z)
  geometry.scale(1 / radius, 1 / radius, 1 / radius)
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()

  const count = geometry.getAttribute('position').count
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(count * 4), 4),
  )

  let start = 0
  const parts = pieces.map((piece, i) => {
    const n = piece.getAttribute('position').count
    // GLTFLoader swaps spaces for underscores in node names.
    const name = meshes[i].name.replaceAll('_', ' ') || `Part ${i + 1}`
    const faces = piece.index!.count
    const part = { name, start, count: n, faces, hidden: false, cls: -1 }
    start += n
    return part
  })

  data.geometry?.dispose()
  Object.assign(data, {
    geometry,
    materials: meshes.map((m) => material(m.material)),
    parts,
    labels: new Int32Array(count).fill(-1),
    center: center.toArray(),
    scale: radius,
  })
}

/** Writes the label overlay: class colors where labeled, transparent elsewhere. */
export function colorize(classes: Cls[]) {
  const attr = data.geometry?.getAttribute('color') as BufferAttribute
  if (!attr) return
  const colors = new Map(
    classes.filter((c) => !c.hidden).map((c) => [c.id, new Color(c.color)]),
  )
  const { labels } = data

  for (let v = 0; v < labels.length; v++) {
    const c = colors.get(labels[v])
    if (c) attr.setXYZW(v, c.r, c.g, c.b, 1)
    else attr.setW(v, 0)
  }
  attr.needsUpdate = true
}

/** Hiding a part empties its geometry group, which every mesh sharing the geometry respects. */
export function hide(index: number, hidden: boolean) {
  const part = data.parts[index]
  data.geometry!.groups[index].count = hidden ? 0 : part.faces
  data.parts = data.parts.map((p, i) => (i === index ? { ...p, hidden } : p))
}

/** Tags each part with the class covering most of it (over half), keeping unchanged parts' identity. */
export function dominant() {
  data.parts = data.parts.map((part) => {
    const counts = new Map<number, number>()
    for (let v = part.start; v < part.start + part.count; v++)
      counts.set(data.labels[v], (counts.get(data.labels[v]) ?? 0) + 1)
    counts.delete(-1)
    let cls = -1
    for (const [id, n] of counts) if (n > part.count / 2) cls = id
    return cls === part.cls ? part : { ...part, cls }
  })
}

export function count(classes: Cls[]) {
  const counts = new Map<number, number>()
  for (const id of data.labels) counts.set(id, (counts.get(id) ?? 0) + 1)
  return classes.map((c) => {
    const n = counts.get(c.id) ?? 0
    return n === c.count ? c : { ...c, count: n }
  })
}

/** Supervisely per-vertex PLY: class color and class_id per vertex, object_id -1 (semantic). ASCII only. */
export function toPLY(classes: Cls[]) {
  const geometry = data.geometry!
  const position = geometry.getAttribute('position')
  const index = geometry.index!
  const ids = new Map(classes.map((c, i) => [c.id, i]))
  const rgb = classes.map((c) =>
    [1, 3, 5].map((i) => parseInt(c.color.slice(i, i + 2), 16)).join(' '),
  )
  const [cx, cy, cz] = data.center
  const s = data.scale

  const lines = [
    'ply',
    'format ascii 1.0',
    `element vertex ${position.count}`,
    'property float x',
    'property float y',
    'property float z',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    'property int class_id',
    'property int object_id',
    `element face ${index.count / 3}`,
    'property list uchar int vertex_indices',
    'end_header',
  ]

  for (let v = 0; v < position.count; v++) {
    const cls = ids.get(data.labels[v]) ?? -1
    const x = position.getX(v) * s + cx
    const y = position.getY(v) * s + cy
    const z = position.getZ(v) * s + cz
    lines.push(`${x} ${y} ${z} ${cls < 0 ? '255 255 255' : rgb[cls]} ${cls} -1`)
  }

  for (let f = 0; f < index.count; f += 3)
    lines.push(`3 ${index.getX(f)} ${index.getX(f + 1)} ${index.getX(f + 2)}`)

  return lines.join('\n') + '\n'
}

export function toMeta(classes: Cls[]) {
  return JSON.stringify(
    {
      classes: classes.map((c) => ({
        title: c.name,
        shape: 'mesh',
        color: c.color,
        geometry_config: {},
      })),
      tags: [],
      projectType: 'meshes',
    },
    null,
    2,
  )
}
