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
  await page.getByRole('button', { name: 'Wireframe' }).focus()
  await page.keyboard.press('Space')
  expect(await ui(page)).toMatchObject({
    shading: 'wireframe',
    selecting: true,
  })
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

// Regression: the clear color was set before choosing the target, so it was encoded twice.
test('the model sees the view on the app’s own background', async ({
  page,
}) => {
  const [corner, background] = await page.evaluate(() => [
    [...window.m.view.frame!.data.slice(0, 3)],
    window.m.BACKGROUND,
  ])
  const gray = parseInt(background.slice(1, 3), 16)
  expect(corner).toEqual([gray, gray, gray])
})

/** Where the gizmo draws an axis head, in page pixels. */
const head = (page: Page, direction: [number, number, number]) =>
  page.evaluate((direction) => {
    const { view, gizmoMargin } = window.m
    const r = view.gl!.domElement.getBoundingClientRect()
    const [mx, my] = gizmoMargin(innerWidth)
    // The gizmo turns with the camera: the head sits along the axis, seen from it.
    const [x, y] = view
      .camera!.position.clone()
      .set(...direction)
      .applyQuaternion(view.camera!.quaternion.clone().invert())
      .toArray()
    return { x: r.right - mx + 40 * x, y: r.bottom - my - 40 * y }
  }, direction)

/** How closely the camera looks down +Y: 1 when straight down. */
const fromAbove = (page: Page) =>
  page.evaluate(() => {
    const { camera, controls } = window.m.view
    return camera!.position.clone().sub(controls!.target).normalize().y
  })

test('a tap on a gizmo axis looks down it; a drag from it orbits, never selecting', async ({
  page,
}) => {
  const y = await head(page, [0, 1, 0])
  const before = await fromAbove(page)
  await page.mouse.move(y.x, y.y)
  await page.mouse.down()
  await page.mouse.move(y.x + 60, y.y + 30, { steps: 6 })
  await page.mouse.up()
  const dragged = await fromAbove(page)
  expect(dragged).not.toBeCloseTo(before, 3)
  expect(dragged).toBeLessThan(0.99)
  expect(await page.evaluate(() => window.m.prompts.get())).toEqual({
    points: [],
    box: null,
  })
  expect(await labeled(page)).toBe(0)

  const tap = await head(page, [0, 1, 0])
  await page.mouse.click(tap.x, tap.y)
  // The camera turns over a few frames, which are slow without a GPU.
  await expect
    .poll(() => fromAbove(page), { timeout: 15_000 })
    .toBeGreaterThan(0.99)
})
