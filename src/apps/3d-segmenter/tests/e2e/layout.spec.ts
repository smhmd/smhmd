import { expect, test } from '@playwright/test'

import { open, ui } from './app'

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('Classes and Parts start folded and open one at a time', async ({
    page,
  }) => {
    await open(page)
    const classes = page.getByRole('button', { name: /^Classes/ })
    const parts = page.getByRole('button', { name: /^Parts/ })
    const box = page.getByRole('button', { name: 'box', exact: true })
    const cracker = page.getByText('Cracker box')

    await expect(box).toBeHidden()
    await expect(cracker).toBeHidden()

    await classes.tap()
    await expect(box).toBeVisible()

    await parts.tap()
    await expect(cracker).toBeVisible()
    await expect(box).toBeHidden()

    await parts.tap()
    await expect(cracker).toBeHidden()
  })

  test('the View toolbar is a menu beside Open and Export', async ({
    page,
  }) => {
    await open(page)
    await expect(page.getByRole('toolbar', { name: 'View' })).toBeHidden()

    await page.getByRole('button', { name: 'View' }).tap()
    await page.getByRole('menuitemcheckbox', { name: 'X-ray' }).tap()
    expect((await ui(page)).xray).toBe(true)
    // It stays open, so several things can change in one go.
    await page.getByRole('menuitemradio', { name: 'Wireframe' }).tap()
    expect((await ui(page)).shading).toBe('wireframe')
  })

  test('About stays out of the way', async ({ page }) => {
    await open(page)
    await expect(
      page.getByRole('button', { name: 'About 3D Segmenter' }),
    ).toBeHidden()
  })
})

test('on a large screen, Classes and Parts are both open and stay open', async ({
  page,
}) => {
  await open(page)
  const box = page.getByRole('button', { name: 'box', exact: true })
  const cracker = page.getByText('Cracker box')
  await expect(box).toBeVisible()
  await expect(cracker).toBeVisible()
  await page.getByRole('button', { name: /^Classes/ }).click({ force: true })
  await expect(box).toBeVisible()
})
