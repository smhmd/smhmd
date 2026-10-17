import { expect, test } from '@playwright/test'

import { labeled, on, open, previewed, ui } from './app'

test.beforeEach(async ({ page }) => {
  await open(page)
  await page.keyboard.press('l')
})

test('hovering previews a dab; Shift previews the whole piece', async ({
  page,
}) => {
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x, box.y)
  const dab = await previewed(page)
  expect(dab).toBeGreaterThan(0)
  await page.keyboard.down('Shift')
  await expect.poll(() => previewed(page)).toBeGreaterThan(dab)
  await page.keyboard.up('Shift')
  await expect.poll(() => previewed(page)).toBe(dab)
})

test('a Shift-click labels the whole part, as previewed', async ({ page }) => {
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x, box.y)
  await page.keyboard.down('Shift')
  await page.mouse.down()
  await page.mouse.up()
  await page.keyboard.up('Shift')
  const part = await page.evaluate(
    () => window.m.data.parts.find((p) => p.name === 'Cracker box')!.count,
  )
  expect(await labeled(page)).toBe(part)
})

test('a drag fills along the way, as one undo step', async ({ page }) => {
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x - 30, box.y)
  await page.mouse.down()
  await page.mouse.move(box.x + 30, box.y, { steps: 8 })
  await page.mouse.up()
  expect(await labeled(page)).toBeGreaterThan(0)
  expect((await ui(page)).past).toBe(1)
  await page.keyboard.press('ControlOrMeta+z')
  expect(await labeled(page)).toBe(0)
})

// Regression: capture returned nothing outside Smart Select, so the hover never came back.
test('the preview comes back once the camera settles', async ({ page }) => {
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x, box.y)
  await page.evaluate(() => window.m.api.move())
  expect(await previewed(page)).toBe(0)
  await expect.poll(() => previewed(page)).toBeGreaterThan(0)
})

test('holding Ctrl hides the preview, releasing brings it back', async ({
  page,
}) => {
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x, box.y)
  await page.keyboard.down('Control')
  expect(await previewed(page)).toBe(0)
  await page.keyboard.up('Control')
  expect(await previewed(page)).toBeGreaterThan(0)
})
