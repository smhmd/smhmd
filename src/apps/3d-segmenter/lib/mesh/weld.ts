/**
 * Each vertex's twin: the first vertex at the same position, to 1e-4 of
 * `radius` around `center`. Within that sphere each quantized axis fits in 15 bits.
 */
export function weld(
  position: ArrayLike<number>,
  center = [0, 0, 0],
  radius = 1,
) {
  const first = new Map<number, number>()
  const twin = new Int32Array(position.length / 3)
  const q = (v: number, axis: number) =>
    Math.round(((position[v * 3 + axis] - center[axis]) / radius) * 1e4) + 16384
  for (let v = 0; v < twin.length; v++) {
    const key = (q(v, 0) * 32768 + q(v, 1)) * 32768 + q(v, 2)
    twin[v] = first.get(key) ?? (first.set(key, v), v)
  }
  return twin
}
