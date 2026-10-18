import {
  BufferAttribute,
  BufferGeometry,
  type Color,
  type InterleavedBufferAttribute,
  type Material,
  Mesh,
  MeshMatcapMaterial,
  type Object3D,
  type Texture,
} from 'three'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js'

import { data } from './geometry'
import { matcap } from './materials'

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

/** More pieces than this is scan noise, not parts worth listing. */
const PIECES = 64

/**
 * A mesh's connected pieces, biggest first, or just the mesh when it's one
 * piece or too many. Welded by position, so seams don't split a piece.
 */
function split(geometry: BufferGeometry) {
  const index = geometry.index!.array
  const p = geometry.getAttribute('position')
  const n = p.count
  const root = Int32Array.from({ length: n }, (_, v) => v)
  const find = (v: number) => {
    while (root[v] !== v) v = root[v] = root[root[v]]
    return v
  }
  const join = (a: number, b: number) => (root[find(a)] = find(b))

  // Quantized to 1e-4 of the radius around the center: 15 bits an axis.
  geometry.computeBoundingSphere()
  const { center, radius } = geometry.boundingSphere!
  const q = (c: number, o: number) =>
    Math.round(((c - o) / radius) * 1e4) + 16384
  const first = new Map<number, number>()
  for (let v = 0; v < n; v++) {
    const key =
      (q(p.getX(v), center.x) * 32768 + q(p.getY(v), center.y)) * 32768 +
      q(p.getZ(v), center.z)
    const twin = first.get(key)
    if (twin === undefined) first.set(key, v)
    else join(v, twin)
  }
  for (let t = 0; t < index.length; t += 3) {
    join(index[t], index[t + 1])
    join(index[t], index[t + 2])
  }

  const groups = new Map<number, number[]>()
  for (let v = 0; v < n; v++) {
    const r = find(v)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r)!.push(v)
  }
  if (groups.size < 2 || groups.size > PIECES) return [geometry]

  const remap = new Int32Array(n)
  return [...groups.values()]
    .sort((a, b) => b.length - a.length)
    .map((vertices) => {
      const piece = new BufferGeometry()
      vertices.forEach((v, i) => (remap[v] = i))
      for (const [name, a] of Object.entries(geometry.attributes)) {
        const out = new Float32Array(vertices.length * a.itemSize)
        vertices.forEach((v, i) => {
          for (let k = 0; k < a.itemSize; k++)
            out[i * a.itemSize + k] = a.getComponent(v, k)
        })
        piece.setAttribute(name, new BufferAttribute(out, a.itemSize))
      }
      const own = find(vertices[0])
      const faces: number[] = []
      for (let t = 0; t < index.length; t += 3)
        if (find(index[t]) === own)
          faces.push(remap[index[t]], remap[index[t + 1]], remap[index[t + 2]])
      piece.setIndex(faces)
      return piece
    })
}

function material(source: Material | Material[]) {
  const m = (Array.isArray(source) ? source[0] : source) as Material & {
    map?: Texture | null
    color?: Color
  }
  return new MeshMatcapMaterial({
    matcap,
    map: m.map ?? null,
    color: m.color,
  })
}

/** Loads a model into `data`: every mesh merged into one geometry, one part each. */
export async function parse(name: string, buffer: ArrayBuffer) {
  const root = await load(name, buffer)
  root.updateMatrixWorld(true)

  const meshes: Mesh[] = []
  root.traverse((o) => (o as Mesh).isMesh && meshes.push(o as Mesh))
  if (!meshes.length) throw new Error(`No meshes in ${name}`)

  // GLTFLoader swaps spaces for underscores in node names.
  const named = (mesh: Mesh, i: number) =>
    mesh.name.replaceAll('_', ' ') || `Part ${i + 1}`
  let sources = meshes.map((mesh, i) => ({
    geometry: clean(mesh),
    name: named(mesh, i),
    material: mesh.material,
  }))
  // A single mesh (often a PLY, STL or scan) lists its separate pieces instead.
  if (sources.length === 1) {
    const [only] = sources
    const pieces = split(only.geometry)
    if (pieces.length > 1)
      sources = pieces.map((geometry, i) => ({
        ...only,
        geometry,
        name: `Piece ${i + 1}`,
      }))
  }
  const pieces = sources.map((s) => s.geometry)
  const geometry = mergeGeometries(pieces, true)
  geometry.computeBoundingSphere()
  const { center, radius } = geometry.boundingSphere!
  geometry.translate(-center.x, -center.y, -center.z)
  geometry.scale(1 / radius, 1 / radius, 1 / radius)
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()

  const count = geometry.getAttribute('position').count
  // Bytes, not floats: a quarter of the memory and of each upload to the GPU.
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Uint8Array(count * 4), 4, true),
  )

  let start = 0
  const parts = pieces.map((piece, i) => {
    const n = piece.getAttribute('position').count
    const { name } = sources[i]
    const faces = piece.index!.count
    const part = { name, start, count: n, faces, hidden: false, cls: -1 }
    start += n
    return part
  })

  // The drawn, ghost and preview indices are refilled in place; a part's
  // outline is just a draw range over the original triangles.
  const triangles = Uint32Array.from(geometry.index!.array)
  const [ghost, outline, preview] = [0, 0, 0].map(() => {
    const g = new BufferGeometry()
    for (const [name, attribute] of Object.entries(geometry.attributes))
      g.setAttribute(name, attribute)
    return g
  })
  geometry.setIndex(new BufferAttribute(triangles.slice(), 1))
  ghost.setIndex(new BufferAttribute(triangles.slice(), 1))
  outline.setIndex(new BufferAttribute(triangles, 1))
  preview.setIndex(new BufferAttribute(triangles.slice(), 1))
  preview.setDrawRange(0, 0)

  const used = new Set(meshes.flatMap((m) => [m.material].flat()))
  const maps = new Set(
    [...used].map((m) => (m as { map?: Texture | null }).map).filter(Boolean),
  )
  const box = geometry.boundingBox!

  for (const g of [data.geometry, data.ghost, data.outline, data.preview])
    g?.dispose()
  Object.assign(data, {
    geometry,
    ghost,
    outline,
    preview,
    triangles,
    present: new Uint8Array(count),
    shown: new Uint8Array(count),
    materials: sources.map((s) => material(s.material)),
    parts,
    labels: new Int32Array(count).fill(-1),
    center: center.toArray(),
    scale: radius,
    info: {
      format: name.split('.').pop()!.toUpperCase(),
      bytes: buffer.byteLength,
      size: box.max.clone().sub(box.min).multiplyScalar(radius).toArray(),
      materials: used.size,
      textures: maps.size,
    },
  })
}
