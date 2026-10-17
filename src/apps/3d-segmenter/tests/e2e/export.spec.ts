import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { open } from './app'

test('exports a per-vertex PLY and meta.json for Supervisely', async ({
  page,
}) => {
  await open(page)
  // Hidden parts and X-ray must not change what's exported.
  await page.evaluate(() => window.m.api.togglePart(0))
  await page.keyboard.press('x')
  const downloads: import('@playwright/test').Download[] = []
  page.on('download', (d) => downloads.push(d))
  await page.getByRole('button', { name: 'Export' }).click()
  await expect.poll(() => downloads.length).toBe(2)
  const named = (name: string) =>
    downloads.find((d) => d.suggestedFilename() === name)!
  const [ply, meta] = [named('groceries.ply'), named('meta.json')]
  expect(ply && meta).toBeTruthy()

  const lines = (await readFile(await ply.path(), 'utf8')).trim().split('\n')
  const { vertices, faces } = await page.evaluate(() => ({
    vertices: window.m.data.labels.length,
    faces: window.m.data.triangles.length / 3,
  }))
  expect(lines).toContain(`element vertex ${vertices}`)
  expect(lines).toContain(`element face ${faces}`)
  expect(lines.length).toBe(lines.indexOf('end_header') + 1 + vertices + faces)

  const json = JSON.parse(await readFile(await meta.path(), 'utf8'))
  expect(json.projectType).toBe('meshes')
})
