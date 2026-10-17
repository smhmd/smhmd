import { expect, type Page, test } from '@playwright/test'

import { fakeModel, labeled, on, open, ui } from './app'

const island = (page: Page) => page.getByRole('status')

/** Drags a file over the window, where it says it's listening, and drops it. */
async function drop(page: Page, name: string, content: string) {
  await page.evaluate(
    ([name, content]) => {
      window.dragged = new DataTransfer()
      window.dragged.items.add(new File([content], name))
      document.body.dispatchEvent(
        new DragEvent('dragenter', {
          dataTransfer: window.dragged,
          bubbles: true,
        }),
      )
    },
    [name, content],
  )
  await expect(page.getByText('Drop to Open')).toBeVisible()
  await page.evaluate(() =>
    document.body.dispatchEvent(
      new DragEvent('drop', { dataTransfer: window.dragged, bubbles: true }),
    ),
  )
}

declare global {
  interface Window {
    dragged: DataTransfer
  }
}

const TRIANGLE = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'

test('a dropped model opens, and the window says so while it’s over', async ({
  page,
}) => {
  await open(page)
  await drop(page, 'triangle.obj', TRIANGLE)
  await expect.poll(async () => (await ui(page)).mesh).toBe(2)
  await expect(page.getByText('Drop to Open')).toBeHidden()
  await expect(page.getByText('triangle.obj')).toBeVisible()
})

test('a file it can’t read says why, and keeps the model', async ({ page }) => {
  await open(page)
  await drop(page, 'scene.dae', '<COLLADA />')
  await expect(island(page)).toContainText('Can’t open .dae files')
  await drop(page, 'broken.glb', 'not a glb')
  await expect(island(page)).toContainText('Couldn’t open broken.glb')
  expect((await ui(page)).mesh).toBe(1)
})

test('a box drawn before Smart Select is ready waits, then runs', async ({
  page,
}) => {
  // Ready only when the test says so.
  await open(
    page,
    fakeModel(
      `new BroadcastChannel('model').onmessage = () => postMessage({ type: 'ready' })`,
    ),
  )
  const at = await on(page, 'Cracker box')
  await page.mouse.move(at.x - 40, at.y - 40)
  await page.mouse.down()
  await page.mouse.move(at.x + 40, at.y + 40, { steps: 5 })
  await page.mouse.up()
  await expect(island(page)).toContainText(
    'Selecting once Smart Select is ready',
  )
  expect(await labeled(page)).toBe(0)
  await page.evaluate(() => new BroadcastChannel('model').postMessage('ready'))
  await expect.poll(() => labeled(page)).toBeGreaterThan(0)
  expect((await ui(page)).selecting).toBe(true)
})

test('a model that won’t load offers a retry', async ({ page }) => {
  await open(
    page,
    fakeModel(
      `postMessage({ type: 'error', message: 'offline', fatal: true })`,
    ),
  )
  await expect(island(page)).toContainText('Smart Select couldn’t load')
  await page.route(/sam\.worker\.ts/, (route) =>
    route.fulfill({ contentType: 'text/javascript', body: fakeModel() }),
  )
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect.poll(async () => (await ui(page)).status).toBe('ready')
})
