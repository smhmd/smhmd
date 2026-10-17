import { expect, test } from '@playwright/test'

import { labeled, on, open, ring, ui } from './app'

test.beforeEach(async ({ page }) => {
  await open(page)
  await page.keyboard.press('b')
})

async function paint(page: import('@playwright/test').Page, name: string) {
  const at = await on(page, name)
  await page.mouse.move(at.x - 20, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + 20, at.y, { steps: 5 })
  await page.mouse.up()
}

test('brush paints, eraser erases, undo and redo step through', async ({
  page,
}) => {
  await paint(page, 'Cracker box')
  const painted = await labeled(page)
  expect(painted).toBeGreaterThan(0)
  await page.keyboard.press('e')
  await paint(page, 'Cracker box')
  expect(await labeled(page)).toBeLessThan(painted)
  await page.keyboard.press('ControlOrMeta+z')
  expect(await labeled(page)).toBe(painted)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  expect(await labeled(page)).toBeLessThan(painted)
})

test('mid-stroke, shortcuts wait and Esc cancels the stroke', async ({
  page,
}) => {
  const at = await on(page, 'Cracker box')
  await page.mouse.move(at.x - 20, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + 20, at.y, { steps: 5 })
  await page.keyboard.press('e')
  await page.keyboard.press('ControlOrMeta+z')
  expect((await ui(page)).tool).toBe('brush')
  expect(await labeled(page)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  expect(await labeled(page)).toBe(0)
  await page.mouse.up()
  expect(await ui(page)).toMatchObject({ past: 0, future: 0 })
})

test('scrolling resizes on the model, not over the controls', async ({
  page,
}) => {
  const at = await on(page, 'Cracker box')
  await page.mouse.move(at.x, at.y)
  const before = (await ui(page)).radius
  await page.mouse.wheel(0, -200)
  await expect.poll(async () => (await ui(page)).radius).toBeGreaterThan(before)
  const grown = (await ui(page)).radius
  await page.getByRole('button', { name: /Active Class/ }).hover()
  await page.mouse.wheel(0, -200)
  expect((await ui(page)).radius).toBe(grown)
})

test('the ring follows the pointer, hides over controls, survives a tool switch', async ({
  page,
}) => {
  const at = await on(page, 'Cracker box')
  await page.mouse.move(at.x, at.y)
  expect(await ring(page)).not.toBeNull()
  await page.getByRole('button', { name: /Active Class/ }).hover()
  expect(await ring(page)).toBeNull()
  await page.mouse.move(at.x, at.y)
  await page.keyboard.press('l')
  expect(await ring(page)).not.toBeNull()
})

test('Ctrl turns any tool into the hand: dragging orbits instead of painting', async ({
  page,
}) => {
  const at = await on(page, 'Cracker box')
  const view = () =>
    page.evaluate(() => ({
      camera: window.m.view.camera!.position.toArray(),
      target: window.m.view.controls!.target.toArray(),
    }))
  const before = await view()
  await page.mouse.move(at.x, at.y)
  await page.keyboard.down('Control')
  await expect(page.locator('body')).toHaveAttribute('data-hand', '')
  await page.mouse.down()
  await page.mouse.move(at.x + 120, at.y, { steps: 6 })
  await page.mouse.up()
  await page.keyboard.up('Control')
  await expect(page.locator('body')).not.toHaveAttribute('data-hand')
  expect(await labeled(page)).toBe(0)
  const after = await view()
  expect(after.camera).not.toEqual(before.camera)
  // Orbited, not panned: the point it turns around stays put.
  expect(after.target).toEqual(before.target)
})

test('Ctrl with another key is a shortcut, not the hand', async ({ page }) => {
  await page.keyboard.down('Control')
  await page.keyboard.press('z')
  await expect(page.locator('body')).not.toHaveAttribute('data-hand')
  await page.keyboard.up('Control')
})
