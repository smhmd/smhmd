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
    () =>
      window.m.mesh.parts.value.find((p) => p.name === 'Cracker box')!.count,
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
  await page.evaluate(() => window.m.editor.cameraMoved())
  expect(await previewed(page)).toBe(0)
  await expect.poll(() => previewed(page)).toBeGreaterThan(0)
})

test('holding the hand key hides the preview, releasing brings it back', async ({
  page,
}) => {
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x, box.y)
  await page.keyboard.down('ControlOrMeta')
  expect(await previewed(page)).toBe(0)
  await page.keyboard.up('ControlOrMeta')
  expect(await previewed(page)).toBeGreaterThan(0)
})

// Regression: with X-ray, a finished fill leaves what's drawn, and picking
// waited for the camera to move before it worked again.
test('with X-ray, the next part previews right after a fill', async ({
  page,
}) => {
  await page.keyboard.press('x')
  await expect
    .poll(() => page.evaluate(() => window.m.view.stale.value))
    .toBe(false)
  const box = await on(page, 'Cracker box')
  await page.mouse.move(box.x, box.y)
  await page.keyboard.down('Shift')
  await page.mouse.down()
  await page.mouse.up()
  await page.keyboard.up('Shift')
  const can = await on(page, 'Coffee can')
  await page.mouse.move(can.x, can.y)
  expect(await previewed(page)).toBeGreaterThan(0)
})
