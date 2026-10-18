import { data } from '../mesh'

/**
 * The mesh as loaded, as ASCII PLY: every vertex in the file's own units and
 * every triangle, so vertex indices into it are the app's own.
 */
export function ply() {
  const position = data.geometry!.getAttribute('position')
  // Every triangle: the drawn index leaves out hidden and X-rayed ones.
  const { triangles, center, scale } = data
  const [cx, cy, cz] = center

  const lines = [
    'ply',
    'format ascii 1.0',
    `element vertex ${position.count}`,
    'property float x',
    'property float y',
    'property float z',
    `element face ${triangles.length / 3}`,
    'property list uchar int vertex_indices',
    'end_header',
  ]
  // Positions are 32-bit floats: seven significant digits is all they hold.
  const unit = (n: number, offset: number) =>
    Number((n * scale + offset).toPrecision(7))
  for (let v = 0; v < position.count; v++)
    lines.push(
      `${unit(position.getX(v), cx)} ${unit(position.getY(v), cy)} ${unit(position.getZ(v), cz)}`,
    )
  for (let t = 0; t < triangles.length; t += 3)
    lines.push(`3 ${triangles[t]} ${triangles[t + 1]} ${triangles[t + 2]}`)
  return lines.join('\n') + '\n'
}
