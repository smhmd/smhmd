import type { Page } from '@playwright/test'

declare global {
  interface Window {
    /** The app's lib, for driving and inspecting it; dev builds only. */
    m: typeof import('../../lib')
    loading?: Promise<unknown>
  }
}

/**
 * Stands in for EdgeTAM: answers a box with the box, and points with a
 * square around each, so Smart Select runs without the model.
 */
const FAKE_MODEL = /* js */ `
  let size
  onmessage = ({ data }) => {
    if (data.type === 'load') postMessage({ type: 'ready' })
    if (data.type === 'encode') {
      size = [data.width, data.height]
      postMessage({ type: 'encoded', id: data.id })
    }
    if (data.type === 'decode') {
      const [w, h] = size
      const mask = new Uint8Array(w * h)
      const fill = ([x0, y0, x1, y1], value) => {
        for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y++)
          for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1); x++)
            mask[y * w + x] = value
      }
      if (data.box) fill(data.box, 1)
      for (const p of data.points)
        fill([p.x - 30, p.y - 30, p.x + 30, p.y + 30], p.positive ? 1 : 0)
      postMessage({ type: 'mask', id: data.id, mask })
    }
  }
`

/**
 * Opens the app on the sample, with the fake model, once the view is captured.
 * On a cold start Vite finds dependencies after the first load and reloads,
 * and that page can land on stale bundles and never load the model, so a
 * page that isn't ready in time is opened again.
 */
export async function open(page: Page) {
  await page.route(/sam\.worker\.ts/, (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_MODEL }),
  )
  for (let attempt = 1; ; attempt++) {
    await page.goto('/3d-segmenter')
    try {
      return await page.waitForFunction(
        (lib) => {
          // A reload wipes `window.m`, so import the lib again whenever it's gone.
          if (!window.m) {
            window.loading ??= import(/* @vite-ignore */ lib)
              .then((m) => (window.m = m))
              .finally(() => (window.loading = undefined))
            return false
          }
          return window.m.ui.get().mesh > 0 && !window.m.view.dirty
        },
        '/src/apps/3d-segmenter/lib/index.ts',
        { timeout: 20_000 },
      )
    } catch (error) {
      if (attempt === 3) throw error
    }
  }
}

/** Page coordinates of the visible vertex closest to the middle of a part. */
export async function on(page: Page, name: string) {
  return page.evaluate((name) => {
    const { data, view } = window.m
    const part = data.parts.find((p) => p.name === name)!
    const seen: number[] = []
    for (let v = part.start; v < part.start + part.count; v++)
      if (view.visible[v]) seen.push(v)
    const mean = (k: number) =>
      seen.reduce((sum, v) => sum + view.screen[v * 2 + k], 0) / seen.length
    const [mx, my] = [mean(0), mean(1)]
    const d = (v: number) =>
      (view.screen[v * 2] - mx) ** 2 + (view.screen[v * 2 + 1] - my) ** 2
    const best = seen.reduce((a, b) => (d(b) < d(a) ? b : a))
    const r = view.gl!.domElement.getBoundingClientRect()
    return {
      x: r.left + view.screen[best * 2],
      y: r.top + view.screen[best * 2 + 1],
    }
  }, name)
}

export const labeled = (page: Page, id?: number) =>
  page.evaluate(
    (id) =>
      window.m.data.labels.filter((l) => (id == null ? l >= 0 : l === id))
        .length,
    id,
  )

export const previewed = (page: Page) =>
  page.evaluate(() => window.m.data.preview.drawRange.count)

export const ui = (page: Page) => page.evaluate(() => window.m.ui.get())

/** The ring's (or guides') position, or null when parked off-canvas. */
export const ring = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(
      '[class*="in-data-hand:hidden"]',
    )
    return el && !el.style.translate.startsWith('-9999')
      ? el.style.translate
      : null
  })
