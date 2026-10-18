import { expect, test } from '@playwright/test'

import { open, ui } from './app'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('in Smart Select, two fingers orbit and pinch, and the first finger’s box is dropped', async ({
  page,
  context,
}) => {
  await open(page)
  expect((await ui(page)).tool).toBe('smart')
  const cdp = await context.newCDPSession(page)
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: [number, number][],
  ) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    })
  const camera = () =>
    page.evaluate(() => {
      const { camera, controls } = window.m.view
      return {
        x: camera!.position.x,
        distance: camera!.position.distanceTo(controls!.target),
      }
    })

  // Orbit: the first finger starts a box, the second makes it navigation.
  const start = await camera()
  await touch('touchStart', [[150, 420]])
  await touch('touchStart', [
    [150, 420],
    [250, 420],
  ])
  const xs: number[] = []
  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', [
      [150 + i * 8, 420],
      [250 + i * 8, 420],
    ])
    xs.push((await camera()).x)
  }
  await touch('touchEnd', [])
  // Regression: the controls never saw the first finger, so the camera flashed elsewhere.
  expect(xs.every((x, i) => x < (i ? xs[i - 1] : start.x))).toBe(true)
  expect(await page.evaluate(() => window.m.prompts.get().box)).toBeNull()

  // Pinch apart to zoom in.
  const before = (await camera()).distance
  await touch('touchStart', [[150, 420]])
  await touch('touchStart', [
    [150, 420],
    [250, 420],
  ])
  for (let i = 1; i <= 6; i++)
    await touch('touchMove', [
      [150 - i * 10, 420],
      [250 + i * 10, 420],
    ])
  await touch('touchEnd', [])
  expect((await camera()).distance).toBeLessThan(before)
})

test('the ring shows for the tool’s own finger, not while navigating', async ({
  page,
  context,
}) => {
  await open(page)
  await page.evaluate(() => window.m.api.setTool('brush'))
  const cdp = await context.newCDPSession(page)
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: [number, number][],
  ) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    })
  const ring = () =>
    page.evaluate(
      () =>
        !document.querySelector<HTMLElement>('[class*="in-data-hand:hidden"]')!
          .hidden,
    )

  await touch('touchStart', [[150, 420]])
  await touch('touchMove', [[160, 420]])
  expect(await ring()).toBe(true)
  // A second finger makes it navigation.
  await touch('touchStart', [
    [160, 420],
    [250, 420],
  ])
  await touch('touchMove', [
    [170, 420],
    [260, 420],
  ])
  expect(await ring()).toBe(false)
  await touch('touchEnd', [])

  // So does a drag that starts on the gizmo, even once it leaves it.
  const gizmo = await page.evaluate(() => {
    const r = window.m.view.gl!.domElement.getBoundingClientRect()
    const [mx, my] = window.m.gizmoMargin(innerWidth)
    return [r.right - mx, r.bottom - my] as [number, number]
  })
  await touch('touchStart', [gizmo])
  for (let i = 1; i <= 5; i++)
    await touch('touchMove', [[gizmo[0] - i * 30, gizmo[1] - i * 20]])
  expect(await ring()).toBe(false)
  await touch('touchEnd', [])
})
