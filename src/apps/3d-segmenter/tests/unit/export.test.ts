import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BoxGeometry, SphereGeometry } from 'three'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from '../../lib/api'
import { ply } from '../../lib/export/ply'
import { supervisely } from '../../lib/export/supervisely'
import { doc } from '../../lib/core'
import * as mesh from '../../lib/mesh'
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
    const vertices = doc.labels.peek().length
    const faces = mesh.data.triangles.length / 3
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
    doc.transact((tx) => tx.fill(0, 0, 10))
    mesh.parts.value = mesh.parts.value.map((p, i) => ({
      ...p,
      hidden: i === 1,
    }))
    mesh.refresh(true)
    expect(lines()).toEqual(before)
  })
})

/** Unpacks with the system's tar, so the archive is checked by a real reader. */
async function unpack(name: string) {
  const dir = mkdtempSync(join(tmpdir(), 'supervisely-'))
  const file = join(dir, 'export.tar')
  const blob = supervisely(name, doc.CLASSES)
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
      doc.CLASSES.map((c) => c.name),
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
    const [box, ball] = mesh.parts.value
    doc.transact((tx) => {
      tx.fill(doc.CLASSES[1].id, box.start, box.start + box.count)
      tx.paint([ball.start + 3], doc.CLASSES[2].id)
    })
    const { read, json } = await unpack(name)
    const { labels } = json(`${folder}/annotation.json`)
    expect(labels.map((l: { classTitle: string }) => l.classTitle)).toEqual([
      doc.CLASSES[1].name,
      doc.CLASSES[2].name,
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

describe('opening a Supervisely project', () => {
  const name = 'a model with a rather long name, to test long paths.obj'
  const dataset = name.replace('.obj', '')
  const open = (archive: BlobPart) =>
    api.open(new File([archive], 'project.tar'))

  /** Every vertex as its coordinates and class: what labels mean, whatever the vertex order. */
  const labeled = () => {
    const all = lines()
    const first = header(all).length
    return Array.from(doc.labels.peek(), (id, v) => `${all[first + v]} ${id}`)
  }
  const label = () => {
    const [box, ball] = mesh.parts.value
    doc.transact((tx) => {
      tx.fill(1, box.start, box.start + box.count)
      tx.paint([ball.start + 3], 2)
    })
    return labeled().sort()
  }

  test('brings back an export’s classes and labels', async () => {
    const [box, ball] = mesh.parts.value
    const before = label()
    const classes = doc.CLASSES.map((c) => ({ ...c, name: `${c.name}s` }))
    await open(supervisely(name, classes))
    expect(mesh.name.value).toBe(`${dataset}.ply`)
    expect(doc.classes.value).toEqual(classes)
    // The file is one mesh, so it splits into pieces again, the ball first:
    // the labels had to follow their vertices.
    expect(mesh.parts.value.map((p) => p.count)).toEqual([
      ball.count,
      box.count,
    ])
    expect(labeled().sort()).toEqual(before)
  })

  test('reads one packed in a folder by another tar, as Supervisely’s are', async () => {
    const before = label()
    const { dir } = await unpack(name)
    mkdirSync(join(dir, 'project'))
    for (const entry of ['meta.json', dataset])
      renameSync(join(dir, entry), join(dir, 'project', entry))
    const file = join(dir, 'project.tar')
    execFileSync('tar', ['--format=pax', '-cf', file, '-C', dir, 'project'])
    await open(readFileSync(file))
    expect(labeled().sort()).toEqual(before)
  })
})
