import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { open } from './app'

test('exports a Supervisely mesh project as one tar', async ({ page }) => {
  await open(page)
  await page.evaluate(() =>
    window.m.api.assignPart(window.m.mesh.parts.value[0], 0),
  )
  // Hidden parts and X-ray must not change what's exported.
  await page.evaluate(() => window.m.api.togglePart(1))
  await page.keyboard.press('x')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('groceries.tar')

  const dir = mkdtempSync(join(tmpdir(), 'export-'))
  execFileSync('tar', ['-xf', await file.path(), '-C', dir])
  const read = (path: string) => readFileSync(join(dir, path), 'utf8')
  expect(JSON.parse(read('meta.json')).projectType).toBe('meshes')

  const folder = 'groceries/annotations/groceries.ply'
  const [label] = JSON.parse(read(`${folder}/annotation.json`)).labels
  const count = await page.evaluate(() => window.m.mesh.parts.value[0].count)
  const indices = readFileSync(join(dir, folder, label.geometry.indicesPath))
  expect(indices.length).toBe(count * 4)

  const vertices = await page.evaluate(() => window.m.doc.labels.peek().length)
  expect(read('groceries/meshes/groceries.ply')).toContain(
    `element vertex ${vertices}`,
  )
})
