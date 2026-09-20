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
  await login(page, true)
  const header = page.getByRole('banner')
  await expect(header).toContainText('Merdeck')
  await expect(header).not.toContainText('Project files')
  const theme = header.getByRole('group', { name: 'Theme', exact: true })
  const light = theme.getByRole('button', { name: 'Light theme', exact: true })
  const dark = theme.getByRole('button', { name: 'Dark theme', exact: true })
  const system = theme.getByRole('button', { name: 'System theme', exact: true })
  const logout = header.getByRole('button', { name: 'Log out', exact: true })
  const agent = header.getByRole('button', { name: 'Open AI file editor', exact: true })
  await expect(system).toHaveAttribute('aria-pressed', 'true')
  // With no open file there is no inert save control competing for narrow-screen space.
  await expect(header.getByRole('button')).toHaveCount(5)
  await expect(agent).toBeVisible()
  await expect(header.getByRole('button', { name: /Save/ })).toHaveCount(0)
  await expect(header.getByRole('heading', { level: 1 })).toHaveCount(0)

  if (process.env.MERDECK_TEST_AGENTS !== 'true') {
    // The suite stores a closed panel; workspace.test.tsx covers the shipped open-by-default preference.
    await expect(agent).toHaveAttribute('aria-pressed', 'false')
    await agent.click()
    const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
    await expect(agent).toHaveAttribute('aria-pressed', 'true')
    const notice = editor.getByText('No provider is configured. Set an approved executable path on the service and restart it.', { exact: true })
    await expect(notice).toBeVisible()
    await expect(editor.getByLabel('Engine', { exact: true })).toHaveValue('')
    await expect(editor.getByLabel('Model', { exact: true })).toHaveValue('')
    const composer = editor.getByLabel('Agent instruction', { exact: true })
    await expect(composer).toBeDisabled()
    // The notice is dismissible; the composer stays disabled with its existing message regardless.
    await editor.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await expect(notice).toBeHidden()
    await expect(composer).toBeDisabled()
    await editor.getByRole('button', { name: 'Close AI file editor', exact: true }).click()
    await expect(editor).not.toBeVisible()
    await expect(agent).toHaveAttribute('aria-pressed', 'false')
    // The dismissal lasts for the page's session, not just the one open/close cycle.
    await agent.click()
    await expect(notice).toBeHidden()
    await editor.getByRole('button', { name: 'Close AI file editor', exact: true }).click()
  }

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
  await expect(explorer.getByRole('button', { name: 'Restart', exact: true })).toBeFocused()
  await refresh.hover()
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: 'Refresh files' })).toBeVisible()
  const request = page.waitForRequest(item => new URL(item.url()).pathname === '/api/diagrams/directory')
  await refresh.click()
  await request

  // The status bar names the running version.
  await expect(page.locator('.status-bar')).toContainText(/Merdeck \S+/)
  await page.mouse.move(1, 1)

  // Below the breakpoint the theme switch, the assistant toggle and log out move into one overflow
  // menu; the trigger is the only one of these controls left directly in the header.
  const menuTrigger = header.getByRole('button', { name: 'More options', exact: true })
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(menuTrigger).toBeVisible()
    await expect(theme).toHaveCount(0)
    await expect(logout).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await menuTrigger.click()
    const menu = page.getByRole('menu')
    const menuTheme = menu.getByRole('group', { name: 'Theme', exact: true })
    const menuLight = menuTheme.getByRole('button', { name: 'Light theme', exact: true })
    const menuLogout = menu.getByRole('button', { name: 'Log out', exact: true })
    const menuAgent = menu.getByRole('button', { name: 'Open AI file editor', exact: true })
    await expect(menuTheme).toBeVisible()
    // The same controls keep their accessible name and pressed state once moved into the menu.
    await expect(menuLight).toHaveAttribute('aria-pressed', 'true')
    await expect(menuAgent).toHaveAttribute('aria-pressed', 'false')
    // Controls take their touch-target sizes below the narrow breakpoint.
    await expect.poll(async () => Math.round((await size(menuLight)).width)).toBe(44)
    await expect.poll(async () => Math.round((await size(menuLogout)).width)).toBeGreaterThanOrEqual(44)
    await menuTrigger.click()
    await expect(menu).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Open project files', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Project files', exact: true }).getByRole('button', { name: 'Refresh files', exact: true })).toBeVisible()
})

test('the assistant panel starts closed under the phone breakpoint despite a stored open preference, and an explicit choice still persists', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  // Registered after the shared audit fixture's own init script, so this one runs second on every
  // following navigation and wins: the stored preference says open, as a desktop session left it.
  await page.addInitScript(() => localStorage.setItem('merdeck-agent-open', 'true'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Open project files', exact: true })).toBeVisible()
  const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
  await expect(editor).toBeHidden()
  // Reading the stored value to decide the initial state never writes it back.
  expect(await page.evaluate(() => localStorage.getItem('merdeck-agent-open'))).toBe('true')
  const menuTrigger = page.getByRole('banner').getByRole('button', { name: 'More options', exact: true })
  await menuTrigger.click()
  const agentToggle = page.getByRole('menu').getByRole('button', { name: 'Open AI file editor', exact: true })
  await expect(agentToggle).toHaveAttribute('aria-pressed', 'false')

  // An explicit open still writes the preference, so a desktop session opened afterward finds it.
  await agentToggle.click()
  await expect(editor).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('merdeck-agent-open'))).toBe('true')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await expect(page.getByRole('complementary', { name: 'AI file editor', exact: true })).toBeVisible()
})
