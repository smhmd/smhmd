import { uuid } from 'src/lib/utils'

import { doc } from '../core'
import { ply } from './ply'
import { type Entry, tar, untar } from './tar'

// Not crypto.randomUUID: that only exists on HTTPS, and a phone on the dev server isn't.
const key = () => uuid().replaceAll('-', '')
const json = (value: unknown) => JSON.stringify(value, null, 2)

/** Little-endian 32-bit unsigned integers, as Supervisely stores indices. */
function uint32(values: number[]) {
  const view = new DataView(new ArrayBuffer(values.length * 4))
  values.forEach((v, i) => view.setUint32(i * 4, v, true))
  return new Uint8Array(view.buffer)
}

/**
 * A Supervisely mesh project, as a tar to import: `meta.json` with the
 * classes, then one dataset holding the mesh and its annotation, a label per
 * class with the indices of its vertices.
 * https://docs.supervisely.com/customization-and-integration/00_ann_format_navi/09_supervisely_format_mesh
 */
export function supervisely(name: string, classes: doc.Cls[]) {
  const dataset = name.replace(/\.\w+$/, '')
  const mesh = `${dataset}.ply`
  const folder = `${dataset}/annotations/${mesh}`

  const vertices = new Map(classes.map((c) => [c.id, [] as number[]]))
  doc.labels.peek().forEach((id, v) => vertices.get(id)?.push(v))
  const labels = classes
    .filter((c) => vertices.get(c.id)!.length)
    .map((c) => ({ key: key(), cls: c }))

  const entries: Entry[] = [
    {
      path: 'meta.json',
      data: json({
        classes: classes.map((c) => ({
          title: c.name,
          description: '',
          shape: 'mesh',
          color: c.color.toUpperCase(),
          geometry_config: {},
          hotkey: '',
        })),
        tags: [],
        projectType: 'meshes',
      }),
    },
    { path: `${dataset}/meshes/${mesh}`, data: ply() },
    {
      path: `${folder}/annotation.json`,
      data: json({
        key: key(),
        tags: [],
        labels: labels.map(({ key, cls }) => ({
          key,
          classTitle: cls.name,
          tags: [],
          geometryType: 'mesh',
          geometry: {
            indices: null,
            indicesPath: `geometries/${key}.indices.bin`,
          },
        })),
      }),
    },
    ...labels.map(({ key, cls }) => ({
      path: `${folder}/geometries/${key}.indices.bin`,
      data: uint32(vertices.get(cls.id)!),
    })),
  ]
  return tar(entries)
}

/**
 * A Supervisely mesh project, from Export's tar or Supervisely's: its classes,
 * and each PLY mesh with a class ID per vertex, in the file's vertex order.
 */
export function readProject(buffer: ArrayBuffer) {
  const files = untar(buffer)
  const json = (path: string) =>
    JSON.parse(new TextDecoder().decode(files.get(path)))
  // At the root, as Export writes it, or in a folder, as Supervisely does.
  const meta = [...files.keys()].find((p) => /^([^/]+\/)?meta\.json$/.test(p))
  if (!meta) throw new Error('Not a Supervisely project')
  const root = meta.replace('meta.json', '')

  const classes: doc.Cls[] = json(meta).classes.map(
    (c: { title: string; color: string }, id: number) => ({
      id,
      name: c.title,
      color: c.color.toLowerCase(),
      hidden: false,
    }),
  )
  const ids = new Map(classes.map((c) => [c.name, c.id]))

  const meshes = [...files.keys()].flatMap((path) => {
    const match = path.startsWith(root)
      ? /^(.+)\/meshes\/([^/]+\.ply)$/.exec(path.slice(root.length))
      : null
    if (!match) return []
    const [, dataset, name] = match
    const folder = `${root}${dataset}/annotations/${name}`
    const labels: number[] = []
    for (const label of json(`${folder}/annotation.json`).labels) {
      const bin = files.get(`${folder}/${label.geometry.indicesPath}`)!
      const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
      for (let at = 0; at < bin.length; at += 4)
        labels[view.getUint32(at, true)] = ids.get(label.classTitle)!
    }
    return [{ name, data: files.get(path)!.slice().buffer, labels }]
  })
  return { classes, meshes }
}
