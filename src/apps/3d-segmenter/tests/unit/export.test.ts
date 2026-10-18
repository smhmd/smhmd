import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BoxGeometry, SphereGeometry } from 'three'
import { beforeEach, describe, expect, test } from 'vitest'

import { CLASSES } from '../../lib/common'
import { ply } from '../../lib/export/ply'
import { supervisely } from '../../lib/export/supervisely'
import { data, refresh } from '../../lib/mesh'
import { load } from './fixtures'

// Off the origin, so a lost center would show.
beforeEach(() =>
  load({
    Left_box: new BoxGeometry(1, 1, 1).translate(8, 1, 0),
    Ball: new SphereGeometry(0.5, 12, 8).translate(12, 1, 0),
  }),
)

const lines = () => ply().trim().split('\n')
const header = (all: string[]) => all.slice(0, all.indexOf('end_header') + 1)

describe('ply', () => {
  test('writes every vertex and face', () => {
    const all = lines()
    const head = header(all)
    const vertices = data.labels.length
    const faces = data.triangles.length / 3
    expect(head).toContain(`element vertex ${vertices}`)
    expect(head).toContain(`element face ${faces}`)
    expect(all.length).toBe(head.length + vertices + faces)
  })

  test('restores the original coordinates', () => {
    const all = lines()
    const [x, y, z] = all[header(all).length].split(' ').map(Number)
    // The box's first corner, before scaling into the unit sphere.
    expect([x, y, z]).toEqual([8.5, 1.5, 0.5].map((n) => expect.closeTo(n, 5)))
  })

  // Regression: faces came from the drawn index, which leaves out hidden and X-rayed triangles.
  test('hidden parts and X-ray change nothing', () => {
    const before = lines()
    data.labels.fill(0, 0, 10)
    data.parts[1].hidden = true
    refresh(true)
    expect(lines()).toEqual(before)
  })
})

/** Unpacks with the system's tar, so the archive is checked by a real reader. */
async function unpack(name: string) {
  const dir = mkdtempSync(join(tmpdir(), 'supervisely-'))
  const file = join(dir, 'export.tar')
  const blob = supervisely(name, CLASSES)
  writeFileSync(file, new Uint8Array(await blob.arrayBuffer()))
  execFileSync('tar', ['-xf', file, '-C', dir])
  const read = (path: string) => readFileSync(join(dir, path))
  return { dir, read, json: (path: string) => JSON.parse(String(read(path))) }
}

describe('supervisely', () => {
  // Long enough that the geometry paths pass tar's 100-byte name field.
  const name = 'a model with a rather long name, to test long paths.obj'
  const dataset = name.replace('.obj', '')
  const folder = `${dataset}/annotations/${dataset}.ply`

  test('lays out a mesh project like Supervisely’s own export', async () => {
    const { dir, json } = await unpack(name)
    expect(readdirSync(dir).sort()).toEqual([
      dataset,
      'export.tar',
      'meta.json',
    ])
    expect(readdirSync(join(dir, dataset)).sort()).toEqual([
      'annotations',
      'meshes',
    ])
    const meta = json('meta.json')
    expect(meta.projectType).toBe('meshes')
    expect(meta.classes.map((c: { title: string }) => c.title)).toEqual(
      CLASSES.map((c) => c.name),
    )
    expect(
      meta.classes.every((c: { shape: string }) => c.shape === 'mesh'),
    ).toBe(true)
    expect(json(`${folder}/annotation.json`).labels).toEqual([])
  })

  test('the mesh is the one the indices count in', async () => {
    const { read } = await unpack(name)
    expect(String(read(`${dataset}/meshes/${dataset}.ply`))).toBe(ply())
  })

  test('a label per class, its vertices as little-endian uint32', async () => {
    const [box, ball] = data.parts
    data.labels.fill(CLASSES[1].id, box.start, box.start + box.count)
    data.labels[ball.start + 3] = CLASSES[2].id
    const { read, json } = await unpack(name)
    const { labels } = json(`${folder}/annotation.json`)
    expect(labels.map((l: { classTitle: string }) => l.classTitle)).toEqual([
      CLASSES[1].name,
      CLASSES[2].name,
    ])
    const indices = (label: { geometry: { indicesPath: string } }) => {
      const bytes = read(`${folder}/${label.geometry.indicesPath}`)
      return [
        ...new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4),
      ]
    }
    expect(indices(labels[0])).toEqual(
      Array.from({ length: box.count }, (_, i) => box.start + i),
    )
    expect(indices(labels[1])).toEqual([ball.start + 3])
    expect(labels[0]).toMatchObject({ geometryType: 'mesh', tags: [] })
  })
})
