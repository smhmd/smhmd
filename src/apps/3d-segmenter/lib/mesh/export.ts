import type { Cls } from '../common'
import { data } from './geometry'

/** Supervisely per-vertex PLY: class color and class_id per vertex, object_id -1 (semantic). ASCII only. */
export function toPLY(classes: Cls[]) {
  const position = data.geometry!.getAttribute('position')
  // Every triangle, as loaded: the drawn index leaves out hidden and X-rayed ones.
  const { triangles } = data
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
    `element face ${triangles.length / 3}`,
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

  for (let t = 0; t < triangles.length; t += 3)
    lines.push(`3 ${triangles[t]} ${triangles[t + 1]} ${triangles[t + 2]}`)

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
