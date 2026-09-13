import type { Locator } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { browse, choose, expect, live, login, settledDialog, test } from './support'

async function measureDrawer(dialog: Locator) {
  return dialog.evaluate((popup) => {
    const box = (element: Element) => {
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }
    }
    const bounds = box(popup)
    const style = getComputedStyle(popup)
    const content = { left: bounds.left + Number.parseFloat(style.paddingLeft), right: bounds.right - Number.parseFloat(style.paddingRight) }
    const description = popup.querySelector('[data-slot="dialog-description"]')!
    const range = document.createRange()
    range.selectNodeContents(description)
    const lines = [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }))
    const measure = (selector: string) => [...popup.querySelectorAll(selector)].map(element => ({ tag: element.tagName, slot: element.getAttribute('data-slot'), ...box(element) }))
    return {
      viewport: { width: innerWidth, height: innerHeight },
      popup: bounds,
      content,
      columns: style.gridTemplateColumns,
      containers: measure(':scope > h2, :scope > p, .file-tree, .tree-heading, .tree-search, .tree-bottom, nav'),
      descendants: measure('.file-tree ul, .file-tree li, .file-tree button, .file-tree input'),
      close: box(popup.querySelector('[data-slot="dialog-close"]')!),
      description: { lines, height: description.clientHeight, scrollHeight: description.scrollHeight },
    }
  })
}
function assertContained(measurement: Awaited<ReturnType<typeof measureDrawer>>) {
  const { popup, content, viewport, containers, descendants, description, close } = measurement
  // DOM scroll dimensions round to integers; tolerate only one CSS pixel.
  expect(popup.scrollWidth).toBeLessThanOrEqual(popup.clientWidth + 1)
  expect(popup.left).toBeGreaterThanOrEqual(0)
  expect(popup.right).toBeLessThanOrEqual(viewport.width)
  expect(popup.top).toBeGreaterThanOrEqual(0)
  expect(popup.bottom).toBeLessThanOrEqual(viewport.height)
  expect(containers.length).toBeGreaterThanOrEqual(7)
  expect(descendants.length).toBeGreaterThan(3)
  for (const item of [...containers, ...descendants]) {
    expect(item.left).toBeGreaterThanOrEqual(content.left - 1)
    expect(item.right).toBeLessThanOrEqual(content.right + 1)
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1)
  }
  for (const item of containers) {
    expect(item.top).toBeGreaterThanOrEqual(popup.top)
    expect(item.bottom).toBeLessThanOrEqual(popup.bottom)
  }
  // The sourced corner close button occupies the popup's padding rail.
  expect(close.left).toBeGreaterThanOrEqual(popup.left)
  expect(close.right).toBeLessThanOrEqual(popup.right)
  expect(close.top).toBeGreaterThanOrEqual(popup.top)
  expect(close.bottom).toBeLessThanOrEqual(popup.bottom)
  expect(description.lines.length).toBeGreaterThanOrEqual(2)
  expect(description.scrollHeight).toBeLessThanOrEqual(description.height + 1)
  for (const line of description.lines) {
    expect(line.left).toBeGreaterThanOrEqual(content.left - 1)
    expect(line.right).toBeLessThanOrEqual(content.right + 1)
    expect(line.top).toBeGreaterThanOrEqual(popup.top)
    expect(line.bottom).toBeLessThanOrEqual(popup.bottom)
  }
}

test('file drawer contains long nested labels, wrapped help and usable controls at narrow widths', async ({ page }, info) => {
  const root = process.env.MERDECK_SMOKE_ROOT
  if (!root)
    throw new Error('An explicit disposable sample root is required')
  const samplePaths = ['welcome.mmd', 'sequence.mermaid', 'docs/overview.md']
  const samples = await Promise.all(samplePaths.map(path => readFile(join(root, path))))
  const owned = await mkdtemp(join(root, 'drawer-'))
  const folder = join(owned, 'long-nested-directory-with-a-continuous-name', 'another-long-directory-name')
  const filename = 'drawer-target-diagram-with-a-deliberately-long-continuous-filename.mmd'
  const path = join(folder, filename)
  const source = 'flowchart LR\n  Project --> Diagram\n'
  const draft = 'flowchart LR\n  Project --> Retained\n'
  await mkdir(folder, { recursive: true })
  await writeFile(path, source)
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, true)
    const opener = page.getByRole('button', { name: 'Open project files', exact: true })
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 })
      await opener.click()
      await settledDialog(page)
      const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
      const search = dialog.getByRole('textbox', { name: 'Filter files', exact: true })
      await expect(dialog).toHaveAccessibleDescription('Select a file or a diagram block. Your drafts stay in this tab.')
      await expect(search).toBeFocused()
      const measurement = await measureDrawer(dialog)
      await writeFile(info.outputPath(`drawer-${width}.json`), JSON.stringify(measurement, null, 2))
      await page.screenshot({ path: info.outputPath(`drawer-${width}.png`), fullPage: true, animations: 'disabled' })
      assertContained(measurement)
      // The explorer heading actions precede the filter, which still receives the initial focus.
      await page.keyboard.press('Shift+Tab')
      await expect(dialog.getByRole('button', { name: 'Restart', exact: true })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(search).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(opener).toBeFocused()
      await opener.click()
      await settledDialog(page)
      await browse(page, relative(root, folder))
      await search.fill('drawer-target')
      await expect(dialog.getByRole('button', { name: 'welcome.mmd', exact: true })).toHaveCount(0)
      const target = dialog.locator('button').filter({ has: dialog.page().locator(`span:text-is("${filename}")`) })
      await expect(target).toHaveAttribute('title', relative(root, path))
      assertContained(await measureDrawer(dialog))
      await target.click()
      await expect(dialog).toHaveCount(0)
      await page.getByRole('tab', { name: 'Source', exact: true }).click()
      const editor = page.getByLabel('Mermaid source', { exact: true })
      await expect(editor).toHaveValue(width === 390 ? source : draft)
      await editor.fill(draft)
      await page.getByRole('tab', { name: 'Preview', exact: true }).click()
      await live(page)
      await expect(page.locator('.diagram-graphic svg')).toContainText('Retained')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.setViewportSize({ width: 1440, height: 920 })
    await choose(page, 'welcome.mmd')
    await live(page)
    await choose(page, relative(root, path))
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue(draft)
    await live(page)
    await expect(opener).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('drawer-desktop.png'), fullPage: true, animations: 'disabled' })
    expect(await readFile(path, 'utf8')).toBe(source)
    for (const [index, sample] of samplePaths.entries())
      expect(await readFile(join(root, sample))).toEqual(samples[index])
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})
