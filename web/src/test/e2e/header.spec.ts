import type { Locator } from '@playwright/test'
import { choose, expect, login, test } from './support'

async function size(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box)
    throw new Error('Expected a rendered element')
  return box
}

async function primaryTooltip(tooltip: Locator) {
  await expect(tooltip).toBeVisible()
  const colors = await tooltip.evaluate((element) => {
    const popup = getComputedStyle(element)
    const arrow = getComputedStyle(element.lastElementChild!)
    const logo = getComputedStyle(document.querySelector('.brand-symbol')!)
    const luminance = (color: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const pixel = context.getImageData(0, 0, 1, 1).data
      const channel = (value: number) => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
      return 0.2126 * channel(pixel[0]!) + 0.7152 * channel(pixel[1]!) + 0.0722 * channel(pixel[2]!)
    }
    const ink = luminance(popup.color)
    const paper = luminance(popup.backgroundColor)
    return { background: popup.backgroundColor, foreground: popup.color, arrowBackground: arrow.backgroundColor, arrowFill: arrow.fill, primary: logo.backgroundColor, primaryForeground: logo.color, contrast: (Math.max(ink, paper) + 0.05) / (Math.min(ink, paper) + 0.05) }
  })
  expect(colors.background).toBe(colors.primary)
  expect(colors.foreground).toBe(colors.primaryForeground)
  expect(colors.arrowBackground).toBe(colors.primary)
  expect(colors.arrowFill).toBe(colors.primary)
  expect(colors.contrast).toBeGreaterThanOrEqual(4.5)
}

test('header keeps the brand, file controls and a complete phone theme menu, and the explorer exposes its actions', async ({ page }, info) => {
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
    const notice = editor.getByText('AI editing is not configured for this project. Ask the project owner to enable it.', { exact: true })
    await expect(notice).toBeVisible()
    await expect(editor.getByLabel('Engine', { exact: true })).toHaveCount(0)
    await expect(editor.getByLabel('Agent instruction', { exact: true })).toHaveCount(0)
    await editor.getByRole('button', { name: 'Close AI file editor', exact: true }).click()
    await expect(editor).not.toBeVisible()
    await expect(agent).toHaveAttribute('aria-pressed', 'false')
    await agent.click()
    await expect(notice).toBeVisible()
    await editor.getByRole('button', { name: 'Close AI file editor', exact: true }).click()
  }

  // Icon controls share one height and render their icons at the design-system size.
  expect((await size(theme)).height).toBeCloseTo(32, 0)
  expect((await size(logout)).height).toBeCloseTo(32, 0)
  for (const icon of [light.locator('svg'), logout.locator('svg')]) {
    expect((await size(icon)).width).toBeCloseTo(20, 0)
    expect((await size(icon)).height).toBeCloseTo(20, 0)
  }

  await dark.hover()
  const themeTooltip = page.locator('[data-slot="tooltip-content"]', { hasText: 'Dark theme' })
  await primaryTooltip(themeTooltip)
  await page.screenshot({ path: info.outputPath('primary-tooltip-light.png'), animations: 'disabled' })
  await dark.click()
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(dark).toHaveAttribute('aria-pressed', 'true')
  await expect(system).toHaveAttribute('aria-pressed', 'false')
  await page.mouse.move(1, 1)
  await expect(themeTooltip).toBeHidden()
  await dark.hover()
  await primaryTooltip(themeTooltip)
  await page.screenshot({ path: info.outputPath('primary-tooltip-dark.png'), animations: 'disabled' })
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
  await primaryTooltip(page.locator('[data-slot="tooltip-content"]', { hasText: 'Log out' }))

  const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
  const search = explorer.getByRole('textbox', { name: 'Filter files', exact: true })
  const refresh = explorer.getByRole('button', { name: 'Refresh files', exact: true })
  expect((await size(refresh.locator('svg'))).width).toBeCloseTo(16, 0)
  await search.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(explorer.getByRole('button', { name: 'Restart listing', exact: true })).toBeFocused()
  await refresh.hover()
  await primaryTooltip(page.locator('[data-slot="tooltip-content"]', { hasText: 'Refresh files' }))
  const request = page.waitForRequest(item => new URL(item.url()).pathname === '/api/diagrams/directory')
  await refresh.click()
  await request

  // The status bar names the running version.
  await expect(page.locator('.status-bar')).toContainText(/Merdeck \S+/)
  await choose(page, 'welcome.mmd')
  const copy = header.getByRole('button', { name: 'Copy absolute path', exact: true })
  const save = header.getByRole('button', { name: /^Save/ })
  await expect(save).toHaveText('Save')
  const sync = header.locator('.file-sync-status')
  await expect(sync).toHaveAttribute('data-sync-state', 'synced')
  for (const control of [copy, save, agent])
    expect((await size(control)).height).toBeCloseTo(32, 0)
  expect((await size(header.locator('.brand-symbol'))).height).toBeCloseTo(32, 0)
  for (const icon of [copy.locator('svg'), sync.locator('.sync-arrows')]) {
    expect((await size(icon)).width).toBeCloseTo(20, 0)
    expect((await size(icon)).height).toBeCloseTo(20, 0)
  }
  await light.hover()
  await primaryTooltip(page.locator('[data-slot="tooltip-content"]', { hasText: 'Light theme' }))
  await page.screenshot({ path: info.outputPath('save-primary-tooltip.png'), animations: 'disabled' })
  await page.mouse.move(1, 1)

  // Below the breakpoint the theme switch and log out move into one overflow menu, while the
  // assistant toggle stays in the header beside its trigger: opening the assistant is done often
  // enough on a phone that it is not worth a second tap.
  const menuTrigger = header.getByRole('button', { name: 'More options', exact: true })
  for (const width of [390, 360, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(menuTrigger).toBeVisible()
    await expect(theme).toHaveCount(0)
    await expect(logout).toHaveCount(0)
    await expect(agent).toBeVisible()
    await expect(agent).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => Math.round((await size(agent)).width)).toBeGreaterThanOrEqual(44)
    const syncBounds = await size(sync)
    const brand = header.locator('.brand-symbol')
    const brandBounds = await size(brand)
    expect(brandBounds.width).toBeCloseTo(44, 0)
    expect(brandBounds.height).toBeCloseTo(44, 0)
    expect(brandBounds.y + brandBounds.height / 2).toBeCloseTo(syncBounds.y + syncBounds.height / 2, 0)
    const brandViewport = await brand.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        width: element.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight),
        height: element.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom),
      }
    })
    expect(brandViewport).toEqual({ width: 20, height: 20 })
    let right = 0
    for (const control of [copy, save, agent, menuTrigger]) {
      const box = await size(control)
      expect(box.height).toBeCloseTo(44, 0)
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.y + box.height / 2).toBeCloseTo(syncBounds.y + syncBounds.height / 2, 0)
      expect(box.x).toBeGreaterThanOrEqual(right)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      right = box.x + box.width
    }
    for (const icon of [copy.locator('svg'), sync.locator('.sync-arrows'), agent.locator('svg'), menuTrigger.locator('svg')]) {
      expect((await size(icon)).width).toBeCloseTo(20, 0)
      expect((await size(icon)).height).toBeCloseTo(20, 0)
    }
    await page.screenshot({ path: info.outputPath(`header-controls-${width}.png`), animations: 'disabled' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await menuTrigger.click()
    const menu = page.getByRole('menu')
    const menuTheme = menu.getByRole('group', { name: 'Theme', exact: true })
    const menuLight = menuTheme.getByRole('button', { name: 'Light theme', exact: true })
    const menuLogout = menu.getByRole('button', { name: 'Log out', exact: true })
    await expect(menuTheme).toBeVisible()
    await expect(menu.getByRole('button', { name: 'Open AI file editor', exact: true })).toHaveCount(0)
    // The same controls keep their accessible name and pressed state once moved into the menu.
    await expect(menuLight).toHaveAttribute('aria-pressed', 'true')
    // Controls take their touch-target sizes below the narrow breakpoint.
    await expect.poll(async () => Math.round((await size(menuLight)).width)).toBe(44)
    await expect.poll(async () => Math.round((await size(menuLogout)).width)).toBeGreaterThanOrEqual(44)
    const menuBounds = await size(menu)
    const triggerBounds = await size(menuTrigger)
    expect(triggerBounds.x).toBeGreaterThanOrEqual(0)
    expect(triggerBounds.x + triggerBounds.width).toBeLessThanOrEqual(width)
    expect(menuBounds.x).toBeGreaterThanOrEqual(0)
    expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(width)
    for (const name of ['Light theme', 'Dark theme', 'System theme']) {
      const button = menuTheme.getByRole('button', { name, exact: true })
      for (const control of [button, button.locator('svg')]) {
        const box = await size(control)
        expect(box.x).toBeGreaterThanOrEqual(menuBounds.x)
        expect(box.x + box.width).toBeLessThanOrEqual(menuBounds.x + menuBounds.width)
        expect(box.y).toBeGreaterThanOrEqual(menuBounds.y)
        expect(box.y + box.height).toBeLessThanOrEqual(menuBounds.y + menuBounds.height)
      }
    }
    await page.mouse.move(1, 1)
    await page.screenshot({ path: info.outputPath(`theme-menu-${width}.png`), animations: 'disabled' })
    await menuTrigger.click()
    await expect(menu).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Open project files', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Project files', exact: true })
  for (const name of ['New file', 'New folder', 'Refresh files', 'Restart listing']) {
    const button = drawer.getByRole('button', { name, exact: true })
    await expect(button).toBeVisible()
    const box = await size(button)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
  }
  await page.mouse.move(1, 1)
  await page.screenshot({ path: info.outputPath('explorer-actions-phone.png'), animations: 'disabled' })
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
  const agentToggle = page.getByRole('banner').getByRole('button', { name: 'Open AI file editor', exact: true })
  await expect(agentToggle).toHaveAttribute('aria-pressed', 'false')

  // An explicit open still writes the preference, so a desktop session opened afterward finds it.
  await agentToggle.click()
  await expect(editor).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('merdeck-agent-open'))).toBe('true')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await expect(page.getByRole('complementary', { name: 'AI file editor', exact: true })).toBeVisible()
})
