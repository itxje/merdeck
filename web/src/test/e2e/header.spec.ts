import type { Locator } from '@playwright/test'
import { expect, login, test } from './support'

async function size(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box)
    throw new Error('Expected a rendered element')
  return box
}

test('header keeps the brand, the open file, saving, a theme switch and log out, and the explorer offers refresh', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page)
  const header = page.getByRole('banner')
  await expect(header).toContainText('Merdeck')
  await expect(header).not.toContainText('Project files')
  const theme = header.getByRole('group', { name: 'Theme', exact: true })
  const light = theme.getByRole('button', { name: 'Light theme', exact: true })
  const dark = theme.getByRole('button', { name: 'Dark theme', exact: true })
  const system = theme.getByRole('button', { name: 'System theme', exact: true })
  const logout = header.getByRole('button', { name: 'Log out', exact: true })
  const save = header.getByRole('button', { name: /Save/ })
  await expect(system).toHaveAttribute('aria-pressed', 'true')
  // The brand, the open file and saving share the header; no second bar takes height from the diagram.
  await expect(header.getByRole('button')).toHaveCount(5)
  await expect(save).toBeDisabled()
  await expect(header.getByRole('heading', { level: 1 })).toHaveCount(0)

  // Icon controls share one height and render their icons at the design-system size.
  expect((await size(theme)).height).toBeCloseTo(32, 0)
  expect((await size(logout)).height).toBeCloseTo(32, 0)
  for (const icon of [light.locator('svg'), logout.locator('svg')]) {
    expect((await size(icon)).width).toBeCloseTo(16, 0)
    expect((await size(icon)).height).toBeCloseTo(16, 0)
  }

  await dark.hover()
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: 'Dark theme' })).toBeVisible()
  await dark.click()
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(dark).toHaveAttribute('aria-pressed', 'true')
  await expect(system).toHaveAttribute('aria-pressed', 'false')
  // Pressing the current preference keeps it.
  await dark.click()
  await expect(dark).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('ArrowLeft')
  await expect(light).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(light).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).not.toHaveClass('dark')
  await page.reload()
  await expect(light).toHaveAttribute('aria-pressed', 'true')

  await logout.hover()
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: 'Log out' })).toBeVisible()

  const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
  const search = explorer.getByRole('textbox', { name: 'Filter files', exact: true })
  const refresh = explorer.getByRole('button', { name: 'Refresh files', exact: true })
  expect((await size(refresh.locator('svg'))).width).toBeCloseTo(16, 0)
  await search.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(refresh).toBeFocused()
  await refresh.hover()
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: 'Refresh files' })).toBeVisible()
  const request = page.waitForRequest(item => new URL(item.url()).pathname === '/api/diagrams/tree')
  await refresh.click()
  await request

  // The status bar names the running version.
  await expect(page.locator('.status-bar')).toContainText(/Merdeck \S+/)
  await page.mouse.move(1, 1)

  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(theme).toBeVisible()
    // Controls transition to their touch-target sizes after crossing the narrow breakpoint.
    await expect.poll(async () => Math.round((await size(light)).width)).toBe(44)
    await expect.poll(async () => Math.round((await size(logout)).width)).toBeGreaterThanOrEqual(44)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const headerBox = await size(header)
    for (const control of [theme, logout])
      expect((await size(control)).x + (await size(control)).width).toBeLessThanOrEqual(headerBox.x + headerBox.width)
  }
  await page.getByRole('button', { name: 'Open project files', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Project files', exact: true }).getByRole('button', { name: 'Refresh files', exact: true })).toBeVisible()
})
