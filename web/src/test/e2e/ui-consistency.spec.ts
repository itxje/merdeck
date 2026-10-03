import type { Locator } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, login, mockAgentCapabilities, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

async function settled(locator: Locator) {
  await locator.evaluate(async (element) => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(element.getAnimations({ subtree: true })
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished))
  })
}

async function box(locator: Locator) {
  const bounds = await locator.boundingBox()
  if (!bounds)
    throw new Error('Expected a visible control')
  return bounds
}

function paint(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, foreground: style.color }
  })
}

function inputSkin(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, border: style.borderColor, radius: style.borderRadius }
  })
}

async function contained(child: Locator, parent: Locator) {
  const [item, frame] = await Promise.all([box(child), box(parent)])
  expect(item.x).toBeGreaterThanOrEqual(frame.x)
  expect(item.x + item.width).toBeLessThanOrEqual(frame.x + frame.width + 0.5)
  expect(item.y).toBeGreaterThanOrEqual(frame.y)
  expect(item.y + item.height).toBeLessThanOrEqual(frame.y + frame.height + 0.5)
}

for (const scheme of ['light', 'dark'] as const) {
  test(`selections and toolbars share the brand palette and geometry in ${scheme} mode`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.setViewportSize({ width: 1440, height: 900 })
    await mockAgentCapabilities(page)
    await login(page, true)
    await choose(page, 'welcome.mmd')
    await settled(page.locator('.workspace'))
    const brand = await paint(page.locator('.brand-symbol'))
    for (const selected of [page.locator('.theme-switch button[data-pressed]'), page.locator('.tree-file-types button[aria-pressed="true"]'), page.locator('.tree-row[aria-current="true"]')])
      expect.soft(await paint(selected)).toEqual(brand)
    const header = page.getByRole('banner')
    for (const control of [header.getByRole('button', { name: 'Open AI file editor', exact: true }), header.getByRole('button', { name: 'Log out', exact: true })])
      expect.soft((await paint(control.locator('svg'))).foreground).toBe(brand.background)
    const explorer = page.locator('.workspace-body > .file-tree')
    expect.soft((await box(explorer.locator('.tree-file-types'))).height).toBeCloseTo(32, 0)
    for (const control of [explorer.getByRole('button', { name: 'Refresh files', exact: true }), page.getByRole('button', { name: 'Hide source', exact: true }), page.getByRole('button', { name: 'Zoom in', exact: true })]) {
      expect.soft((await box(control)).height).toBeCloseTo(32, 0)
      expect.soft((await box(control.locator('svg'))).height).toBeCloseTo(16, 0)
      expect.soft((await paint(control.locator('svg'))).foreground).toBe(brand.background)
    }
    const heading = page.locator('.source-pane .pane-heading')
    expect.soft(await heading.textContent()).not.toContain('Mermaid')
    await contained(page.getByRole('button', { name: 'Hide source', exact: true }), heading)
    await header.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
    await expect(page.getByLabel('Engine', { exact: true })).toBeEnabled()
    await settled(page.locator('.workspace'))
    expect.soft(await paint(header.getByRole('button', { name: 'Open AI file editor', exact: true }))).toEqual(brand)
    await contained(heading.locator('.source-title'), heading)
    await contained(page.getByRole('button', { name: 'Hide source', exact: true }), heading)
    const footer = page.locator('.source-pane .pane-footer')
    for (const item of await footer.locator('span').all()) {
      expect.soft((await box(item)).height).toBeLessThanOrEqual((await box(footer)).height - 8)
      await contained(item, footer)
    }
    await page.screenshot({ path: info.outputPath(`narrow-source-${scheme}-1440.png`), animations: 'disabled' })
    const resizeAgent = page.getByRole('separator', { name: 'Resize AI file editor', exact: true })
    for (let step = 0; step < 17; step++)
      await resizeAgent.press('ArrowLeft')
    await expect(resizeAgent).toHaveAttribute('aria-valuenow', '560')
    for (const width of [1440, 1101, 1100, 901, 768, 701]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect.poll(async () => {
        const panel = await box(page.locator('#source-panel'))
        return await page.locator('.source-pane').isVisible()
          ? panel.width >= 63.5
          : Math.abs(panel.width - 40) <= 0.5
      }).toBe(true)
      if (!await page.locator('.source-pane').isVisible()) {
        const show = page.getByRole('button', { name: 'Show source', exact: true })
        await contained(show, page.locator('.source-rail'))
        await show.click()
      }
      await expect.poll(async () => (await heading.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(63.5)
      await contained(page.getByRole('button', { name: 'Hide source', exact: true }), heading)
      for (const item of await footer.locator('span').all()) {
        await contained(item, footer)
        expect.soft(await item.getAttribute('title')).toBe(await item.textContent())
      }
      await page.getByRole('button', { name: 'Hide source', exact: true }).click()
      const show = page.getByRole('button', { name: 'Show source', exact: true })
      await expect(show).toBeVisible()
      await contained(show, page.locator('.source-rail'))
      await show.click()
      await expect(page.getByLabel('Mermaid source', { exact: true })).toBeVisible()
      const preview = page.locator('.preview-pane')
      const controls = preview.locator('.preview-controls')
      await contained(controls, preview)
      for (const control of await controls.locator('button, output').all())
        await contained(control, controls)
      const zoom = preview.getByLabel('Zoom level', { exact: true })
      const before = await zoom.textContent()
      await preview.getByRole('button', { name: 'Zoom in', exact: true }).click()
      await expect(zoom).not.toHaveText(before!)
      await preview.getByRole('button', { name: 'Fit', exact: true }).click()
      await expect(zoom).toHaveText(before!)
      await page.screenshot({ path: info.outputPath(`wide-assistant-${scheme}-${width}.png`), animations: 'disabled' })
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('complementary', { name: 'AI file editor', exact: true }).getByRole('button', { name: 'Close AI file editor', exact: true }).click()
    await page.screenshot({ path: info.outputPath(`shell-${scheme}-1440.png`), animations: 'disabled' })
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      const selected = page.locator('.phone-tabbar [data-slot="tabs-trigger"][data-active]')
      expect.soft(await paint(selected)).toEqual(brand)
      await contained(selected, page.locator('.phone-tabbar'))
      await page.getByRole('tab', { name: 'Source', exact: true }).click()
      await expect(page.getByLabel('Mermaid source', { exact: true })).toBeVisible()
      await page.getByRole('tab', { name: 'Preview', exact: true }).click()
      await expect(page.getByRole('region', { name: 'Scrollable diagram canvas' })).toBeVisible()
      await contained(page.locator('.preview-controls'), page.locator('.preview-pane'))
      await page.screenshot({ path: info.outputPath(`shell-${scheme}-${width}.png`), animations: 'disabled' })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    const name = `style-guide-${randomUUID()}.md`
    const path = join(root, name)
    await writeFile(path, '# Style guide\n\nKeep controls consistent.\n\n## Layout\n\nKeep navigation readable.\n', { flag: 'wx' })
    try {
      await page.goto(`/?path=${name}`)
      const contents = page.locator('.document-reader > .document-reader-contents')
      const current = contents.locator('[aria-current="location"]')
      await expect(current).toBeVisible()
      expect.soft(await paint(current)).toEqual(brand)
      const toggle = page.getByRole('button', { name: 'Toggle contents', exact: true })
      expect.soft((await box(toggle)).height).toBeCloseTo(32, 0)
      await page.screenshot({ path: info.outputPath(`document-${scheme}-1440.png`), animations: 'disabled' })
      await page.setViewportSize({ width: 320, height: 640 })
      await page.getByRole('button', { name: 'Open contents', exact: true }).click()
      const drawer = page.getByRole('dialog', { name: 'Contents', exact: true })
      const drawerCurrent = drawer.locator('[aria-current="location"]')
      expect.soft(await paint(drawerCurrent)).toEqual(brand)
      expect.soft((await box(drawerCurrent)).height).toBeGreaterThanOrEqual(44)
      await contained(drawerCurrent, drawer)
      await page.screenshot({ path: info.outputPath(`contents-${scheme}-320.png`), animations: 'disabled' })
      await page.keyboard.press('Escape')
      await page.goto('/')
    }
    finally {
      await rm(path)
    }
  })

  test(`forms, dialog actions and assistant controls stay consistent in ${scheme} mode`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const token = page.getByLabel('Access token', { exact: true })
    await expect(token).toBeVisible()
    expect.soft((await box(token)).height).toBeCloseTo(44, 0)
    expect.soft(await token.evaluate(element => getComputedStyle(element).fontSize)).toBe('16px')
    await mockAgentCapabilities(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await page.getByRole('button', { name: 'New file', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'New file', exact: true })
    const input = dialog.getByLabel('Path', { exact: true })
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
    await settled(dialog)
    await cancel.focus()
    await settled(dialog)
    const skin = await inputSkin(input)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 })
      await settled(dialog)
      const height = width === 1440 ? 32 : 44
      for (const control of [input, close, cancel, dialog.getByRole('button', { name: 'Create', exact: true })]) {
        expect.soft((await box(control)).height).toBeCloseTo(height, 0)
        await contained(control, dialog)
      }
      if (width < 700)
        expect.soft(await input.evaluate(element => getComputedStyle(element).fontSize)).toBe('16px')
      expect.soft(await dialog.locator('[data-slot="dialog-title"]').evaluate(element => getComputedStyle(element).fontSize)).toBe('15px')
      const actions = dialog.locator('.review-actions')
      const action = await box(dialog.getByRole('button', { name: 'Create', exact: true }))
      const row = await box(actions)
      expect.soft(action.x + action.width).toBeCloseTo(row.x + row.width, 0)
      await page.screenshot({ path: info.outputPath(`dialog-${scheme}-${width}.png`), animations: 'disabled' })
    }
    await cancel.click()
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
    const agent = page.getByRole('complementary', { name: 'AI file editor', exact: true })
    const engine = agent.getByLabel('Engine', { exact: true })
    const model = agent.getByLabel('Model', { exact: true })
    await expect(engine).toBeEnabled()
    expect.soft(await inputSkin(engine)).toEqual(skin)
    expect.soft(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe(scheme)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 640 })
      for (const control of [engine, model, agent.getByRole('button', { name: 'Close AI file editor', exact: true }), agent.getByRole('button', { name: 'New conversation', exact: true })]) {
        expect.soft((await box(control)).height).toBeCloseTo(width === 1440 ? 32 : 44, 0)
        await contained(control, agent)
      }
      if (width < 700) {
        for (const control of [engine, model, agent.getByLabel('Agent instruction', { exact: true })])
          expect.soft(await control.evaluate(element => getComputedStyle(element).fontSize)).toBe('16px')
      }
      await page.screenshot({ path: info.outputPath(`assistant-${scheme}-${width}.png`), animations: 'disabled' })
    }
    await agent.getByLabel('Agent instruction', { exact: true }).fill('Update the diagram')
    await expect(agent.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
    await engine.selectOption('codex')
    await expect(model).toHaveValue('default')
    await agent.getByRole('button', { name: 'Close AI file editor', exact: true }).click()
    await page.getByRole('button', { name: 'Open project files', exact: true }).click()
    const files = page.getByRole('dialog', { name: 'Project files', exact: true })
    await settled(files)
    await files.getByRole('button', { name: 'Actions for welcome.mmd', exact: true }).click()
    const menu = page.getByRole('menu')
    await settled(menu)
    for (const item of await menu.getByRole('menuitem').all()) {
      expect.soft((await box(item)).height).toBeGreaterThanOrEqual(44)
      await contained(item, menu)
    }
    await contained(menu, page.locator('body'))
    await page.screenshot({ path: info.outputPath(`menu-${scheme}-320.png`), animations: 'disabled' })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
  })
}
