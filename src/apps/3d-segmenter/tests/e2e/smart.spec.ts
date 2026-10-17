import { expect, type Page, test } from '@playwright/test'

import { labeled, on, open, ui } from './app'

test.beforeEach(async ({ page }) => {
  await open(page)
  await page.keyboard.press('s')
  await expect.poll(async () => (await ui(page)).status).toBe('ready')
})

async function box(page: Page, name: string) {
  const at = await on(page, name)
  await page.mouse.move(at.x - 40, at.y - 40)
  await page.mouse.down()
  await page.mouse.move(at.x + 40, at.y + 40, { steps: 5 })
  return at
}

test('a box labels what it covers; Space applies it', async ({ page }) => {
  await box(page, 'Cracker box')
  await page.mouse.up()
  await expect.poll(() => labeled(page)).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: /Apply/ })).toBeVisible()
  const n = await labeled(page)
  await page.keyboard.press('Space')
  expect((await ui(page)).selecting).toBe(false)
  expect(await labeled(page)).toBe(n)
})

test('Enter applies too; a focused control keeps Space for itself', async ({
  page,
}) => {
  await box(page, 'Cracker box')
  await page.mouse.up()
  await expect.poll(() => labeled(page)).toBeGreaterThan(0)
  await page.getByRole('switch', { name: 'Wireframe' }).focus()
  await page.keyboard.press('Space')
  expect(await ui(page)).toMatchObject({ wireframe: true, selecting: true })
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Enter')
  expect((await ui(page)).selecting).toBe(false)
})

test('Esc undoes the selection as if it never happened', async ({ page }) => {
  await box(page, 'Cracker box')
  await page.mouse.up()
  await expect.poll(() => labeled(page)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  expect(await labeled(page)).toBe(0)
  expect(await ui(page)).toMatchObject({ selecting: false, past: 0 })
})

test('Space mid-drag moves the box instead of resizing it', async ({
  page,
}) => {
  const at = await box(page, 'Cracker box')
  await page.keyboard.down('Space')
  await page.mouse.move(at.x + 60, at.y + 60, { steps: 4 })
  await page.keyboard.up('Space')
  await expect(page.locator('body')).not.toHaveAttribute('data-hand')
  await page.mouse.up()
  const sent = await page.evaluate(() => window.m.prompts.get().box!)
  expect(sent[2] - sent[0]).toBeCloseTo(80, 0)
})

test('an Alt-click excludes', async ({ page }) => {
  await box(page, 'Cracker box')
  await page.mouse.up()
  await expect.poll(() => labeled(page)).toBeGreaterThan(0)
  const before = await labeled(page)
  const at = await on(page, 'Cracker box')
  await page.mouse.move(at.x, at.y)
  await page.keyboard.down('Alt')
  await page.mouse.click(at.x, at.y)
  await page.keyboard.up('Alt')
  const points = await page.evaluate(() => window.m.prompts.get().points)
  expect(points.map((p) => p.positive)).toEqual([false])
  await expect.poll(() => labeled(page)).toBeLessThan(before)
})

test('a number key mid-selection relabels it', async ({ page }) => {
  await box(page, 'Cracker box')
  await page.mouse.up()
  await expect.poll(() => labeled(page, 0)).toBeGreaterThan(0)
  const n = await labeled(page, 0)
  await page.keyboard.press('3')
  expect(await labeled(page, 2)).toBe(n)
  expect(await labeled(page, 0)).toBe(0)
})
