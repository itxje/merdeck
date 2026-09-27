import type { Locator } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { browse, choose, expect, live, login, settledDialog, test } from './support'

async function measureDrawer(dialog: Locator) {
  return dialog.evaluate((popup) => {
    const box = (element: Element) => {
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, height: bounds.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }
    }
    const bounds = box(popup)
    const style = getComputedStyle(popup)
    const content = { left: bounds.left + Number.parseFloat(style.paddingLeft), right: bounds.right - Number.parseFloat(style.paddingRight) }
    const measure = (selector: string) => [...popup.querySelectorAll(selector)]
      .filter(element => getComputedStyle(element).display !== 'none')
      .map(element => ({ tag: element.tagName, slot: element.getAttribute('data-slot'), ...box(element) }))
    return {
      viewport: { width: innerWidth, height: innerHeight },
      popup: bounds,
      fileTree: box(popup.querySelector('.file-tree')!),
      content,
      columns: style.gridTemplateColumns,
      containers: measure(':scope > h2:not(.sr-only), :scope > p, .file-tree, .tree-rail, .tree-search, .tree-bottom, nav'),
      descendants: measure('.file-tree ul, .file-tree li, .file-tree button, .file-tree input'),
      close: box(popup.querySelector('[data-slot="dialog-close"]')!),
      heading: box(popup.querySelector('.tree-rail')!),
      headingActions: measure('.tree-rail-actions button'),
    }
  })
}
function assertContained(measurement: Awaited<ReturnType<typeof measureDrawer>>) {
  const { popup, content, viewport, containers, descendants, close, heading, headingActions } = measurement
  // DOM scroll dimensions round to integers; tolerate only one CSS pixel.
  expect(popup.scrollWidth).toBeLessThanOrEqual(popup.clientWidth + 1)
  expect(popup.left).toBeGreaterThanOrEqual(0)
  expect(popup.right).toBeLessThanOrEqual(viewport.width)
  expect(popup.top).toBeGreaterThanOrEqual(0)
  expect(popup.bottom).toBeLessThanOrEqual(viewport.height)
  expect(containers.length).toBeGreaterThanOrEqual(5)
  expect(descendants.length).toBeGreaterThan(3)
  for (const item of [...containers, ...descendants]) {
    expect(item.left).toBeGreaterThanOrEqual(content.left - 1)
    expect(item.right).toBeLessThanOrEqual(content.right + 1)
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1)
  }
  for (const item of containers) {
    expect(item.top).toBeGreaterThanOrEqual(popup.top - 1)
    expect(item.bottom).toBeLessThanOrEqual(popup.bottom + 1)
  }
  // The sourced corner close button occupies the popup's padding rail.
  expect(close.left).toBeGreaterThanOrEqual(popup.left)
  expect(close.right).toBeLessThanOrEqual(popup.right)
  expect(close.top).toBeGreaterThanOrEqual(popup.top)
  expect(close.bottom).toBeLessThanOrEqual(popup.bottom)
  expect(heading.top).toBeLessThanOrEqual(popup.top + 32)
  for (const action of headingActions)
    expect(action.right).toBeLessThanOrEqual(close.left + 1)
}

test('file drawer anchors a compact empty folder at narrow widths', async ({ page }, info) => {
  const root = process.env.MERDECK_SMOKE_ROOT
  if (!root)
    throw new Error('An explicit disposable sample root is required')
  const owned = await mkdtemp(join(root, 'drawer-empty-'))
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, true)
    const opener = page.getByRole('button', { name: 'Open project files', exact: true })
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 })
      await opener.click()
      await settledDialog(page)
      const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
      await browse(page, relative(root, owned))
      await expect(dialog.getByText('No supported entries in this page window', { exact: true })).toBeVisible()
      const measurement = await measureDrawer(dialog)
      await writeFile(info.outputPath(`drawer-empty-${width}.json`), JSON.stringify(measurement, null, 2))
      await page.screenshot({ path: info.outputPath(`drawer-empty-${width}.png`), fullPage: true, animations: 'disabled' })
      assertContained(measurement)
      // Empty folders do not reserve the populated-list height and the sheet meets the viewport edge.
      expect(measurement.fileTree.height).toBeLessThan(measurement.viewport.height * 0.58)
      expect(measurement.popup.bottom).toBeGreaterThanOrEqual(measurement.viewport.height - 1)
      await dialog.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(opener).toBeFocused()
    }
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})

test('file drawer reserves reachable folder rows in a short mobile viewport', async ({ page }, info) => {
  const root = process.env.MERDECK_SMOKE_ROOT
  if (!root)
    throw new Error('An explicit disposable sample root is required')
  const owned = await mkdtemp(join(root, 'drawer-short-'))
  const folders = Array.from({ length: 101 }, (_, index) => `folder-${String(index + 1).padStart(3, '0')}`)
  await Promise.all(folders.map(folder => mkdir(join(owned, folder))))
  await writeFile(join(owned, folders[0]!, 'diagram.mmd'), 'flowchart LR\nA --> B\n')
  try {
    // Open the controlled directory while the drawer is tall enough to navigate, then model the reported short Safari viewport.
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, true)
    const opener = page.getByRole('button', { name: 'Open project files', exact: true })
    await opener.click()
    await settledDialog(page)
    const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
    await browse(page, relative(root, owned))
    const listing = dialog.getByRole('navigation', { name: 'Files and diagrams', exact: true })
    await page.setViewportSize({ width: 315, height: 533 })
    await expect(listing.getByRole('button', { name: folders[0]!, exact: true })).toBeVisible()
    const next = dialog.getByRole('button', { name: 'Next page', exact: true })
    await expect(next).toBeVisible()

    const shortMetrics = await listing.evaluate((node) => {
      const list = node as HTMLElement
      const row = list.querySelector<HTMLElement>('button.tree-row')!
      const listBox = list.getBoundingClientRect()
      const rowBox = row.getBoundingClientRect()
      return {
        clientHeight: list.clientHeight,
        scrollHeight: list.scrollHeight,
        listTop: listBox.top,
        listBottom: listBox.bottom,
        firstTop: rowBox.top,
        firstBottom: rowBox.bottom,
      }
    })
    await writeFile(info.outputPath('drawer-short-mobile.json'), JSON.stringify(shortMetrics, null, 2))
    await page.screenshot({ path: info.outputPath('drawer-short-mobile.png'), fullPage: true, animations: 'disabled' })
    // Two 44px targets must remain visible before the list starts scrolling, even when pagination remains available.
    expect(shortMetrics.clientHeight).toBeGreaterThanOrEqual(88)
    expect(shortMetrics.firstTop).toBeGreaterThanOrEqual(shortMetrics.listTop - 1)
    expect(shortMetrics.firstBottom).toBeLessThanOrEqual(shortMetrics.listBottom + 1)
    expect(shortMetrics.scrollHeight).toBeGreaterThan(shortMetrics.clientHeight)

    const last = listing.getByRole('button', { name: folders[99]!, exact: true })
    await listing.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    await expect(last).toBeVisible()
    const lastMetrics = await last.evaluate((row) => {
      const list = row.closest('nav')!
      const listBox = list.getBoundingClientRect()
      const rowBox = row.getBoundingClientRect()
      return { listTop: listBox.top, listBottom: listBox.bottom, rowTop: rowBox.top, rowBottom: rowBox.bottom }
    })
    expect(lastMetrics.rowTop).toBeGreaterThanOrEqual(lastMetrics.listTop - 1)
    expect(lastMetrics.rowBottom).toBeLessThanOrEqual(lastMetrics.listBottom + 1)
    const nextMetrics = await next.evaluate((button) => {
      const popup = button.closest('[data-slot="dialog-content"]')!
      const buttonBox = button.getBoundingClientRect()
      const popupBox = popup.getBoundingClientRect()
      return { buttonTop: buttonBox.top, buttonBottom: buttonBox.bottom, popupTop: popupBox.top, popupBottom: popupBox.bottom }
    })
    await writeFile(info.outputPath('drawer-short-pagination.json'), JSON.stringify({ shortMetrics, nextMetrics, drawer: await measureDrawer(dialog) }, null, 2))
    expect(nextMetrics.buttonTop).toBeGreaterThanOrEqual(nextMetrics.popupTop)
    expect(nextMetrics.buttonBottom).toBeLessThanOrEqual(nextMetrics.popupBottom)

    await dialog.getByRole('button', { name: '.mmd and .mermaid files', exact: true }).click()
    const results = dialog.getByRole('navigation', { name: 'Search results', exact: true })
    await expect(results.getByRole('button', { name: 'folder-001/diagram.mmd', exact: true })).toBeVisible()
    const searchMetrics = await results.evaluate((node) => {
      const list = node as HTMLElement
      return { clientHeight: list.clientHeight, scrollHeight: list.scrollHeight }
    })
    await writeFile(info.outputPath('drawer-short-search.json'), JSON.stringify(searchMetrics, null, 2))
    expect(searchMetrics.clientHeight).toBeGreaterThanOrEqual(88)
    assertContained(await measureDrawer(dialog))
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})

test('file drawer omits its redundant header while retaining named usable controls at narrow widths', async ({ page }, info) => {
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
  await Promise.all([
    writeFile(path, source),
    ...Array.from({ length: 18 }, (_, index) => writeFile(join(folder, `drawer-extra-${String(index + 1).padStart(2, '0')}.mmd`), source)),
  ])
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
      await expect(dialog.getByText('Select a file or a diagram block. Your drafts stay in this tab.', { exact: true })).toHaveCount(0)
      await expect(dialog.getByRole('heading', { name: 'Project files', exact: true })).toHaveClass(/sr-only/)
      await expect(dialog.getByRole('button', { name: 'Root', exact: true })).toBeFocused()
      await search.focus()
      await expect(search).toBeFocused()
      const measurement = await measureDrawer(dialog)
      await writeFile(info.outputPath(`drawer-${width}.json`), JSON.stringify(measurement, null, 2))
      await page.screenshot({ path: info.outputPath(`drawer-${width}.png`), fullPage: true, animations: 'disabled' })
      assertContained(measurement)
      // The explorer heading actions precede the filter when it is deliberately focused.
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
      const listing = dialog.getByRole('navigation', { name: 'Files and diagrams', exact: true })
      await expect.poll(() => listing.evaluate(node => node.scrollHeight > node.clientHeight), { message: 'Populated mobile listing does not scroll' }).toBe(true)
      await search.fill('drawer-target')
      await expect(dialog.getByRole('button', { name: 'welcome.mmd', exact: true })).toHaveCount(0)
      // The name now renders as a separate stem and extension, so no single span carries the full text; the
      // row's accessible name still equals the full file name (plus the usual unsaved-marker suffix, present
      // on the second pass once this file carries the draft set below), via the aria-label on its name span.
      const target = dialog.getByRole('button', { name: new RegExp(`^${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: Unsaved changes)?$`) })
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
