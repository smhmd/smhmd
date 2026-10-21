const BLOCK = 512
const encoder = new TextEncoder()

export type Entry = { path: string; data: string | Uint8Array }

/** A ustar archive of regular files: all an export needs, and what `tar` and Supervisely read. */
export function tar(entries: Entry[]) {
  const parts: BlobPart[] = []
  for (const { path, data } of entries) {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data
    parts.push(header(path, bytes.length), bytes as BlobPart)
    parts.push(new Uint8Array(-bytes.length & (BLOCK - 1)))
  }
  // Two empty blocks end the archive.
  parts.push(new Uint8Array(BLOCK * 2))
  return new Blob(parts, { type: 'application/x-tar' })
}

const decoder = new TextDecoder()

/** Every file in a tar, by path: ustar like `tar`'s, and the pax paths Supervisely writes past 100 bytes. */
export function untar(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const text = (at: number, length: number) =>
    decoder.decode(bytes.subarray(at, at + length)).replace(/\0.*$/s, '')
  const files = new Map<string, Uint8Array>()
  let pax: string | undefined
  // Two empty blocks end the archive.
  for (let at = 0; bytes[at]; ) {
    const size = parseInt(text(at + 124, 12), 8)
    const type = text(at + 156, 1)
    const prefix = text(at + 345, 155)
    const data = bytes.subarray(at + BLOCK, at + BLOCK + size)
    const path = pax ?? (prefix ? `${prefix}/` : '') + text(at, 100)
    pax = undefined
    if (type === 'x') pax = /\d+ path=(.*)\n/.exec(decoder.decode(data))?.[1]
    else if (type === '0' || type === '')
      files.set(path.replace(/^\.\//, ''), data)
    at += BLOCK + Math.ceil(size / BLOCK) * BLOCK
  }
  return files
}

function header(path: string, size: number) {
  const block = new Uint8Array(BLOCK)
  const write = (offset: number, length: number, value: string | Uint8Array) =>
    block.set(
      (typeof value === 'string' ? encoder.encode(value) : value).subarray(
        0,
        length,
      ),
      offset,
    )
  const octal = (n: number, length: number) =>
    n.toString(8).padStart(length - 1, '0') + '\0'

  const [prefix, name] = split(encoder.encode(path))
  write(0, 100, name)
  write(100, 8, octal(0o644, 8))
  write(108, 8, octal(0, 8))
  write(116, 8, octal(0, 8))
  write(124, 12, octal(size, 12))
  write(136, 12, octal(Math.floor(Date.now() / 1000), 12))
  write(148, 8, ' '.repeat(8)) // counted as spaces while summing
  write(156, 1, '0') // a regular file
  write(257, 8, 'ustar\u000000')
  write(345, 155, prefix)
  const sum = block.reduce((total, byte) => total + byte, 0)
  write(148, 8, sum.toString(8).padStart(6, '0') + '\0 ')
  return block
}

/** Paths over 100 bytes split at a slash: up to 155 bytes of prefix, the rest as the name. */
function split(path: Uint8Array): [Uint8Array, Uint8Array] {
  if (path.length <= 100) return [new Uint8Array(0), path]
  const slash = '/'.charCodeAt(0)
  for (let i = Math.min(path.length - 2, 155); i > 0; i--)
    if (path[i] === slash && path.length - i - 1 <= 100)
      return [path.subarray(0, i), path.subarray(i + 1)]
  throw new Error(`Path too long for tar: ${new TextDecoder().decode(path)}`)
}
