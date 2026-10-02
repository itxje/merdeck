import type { Locator } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { browse, expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

const longName = 'project-diagram-with-a-continuous-filename-and-a-long-description.mmd'
const names = ['a.mmd', 'flow-decisions.mmd', 'flow-decisions_zh.mmd', 'flow-recovery.mmd', 'flow-recovery_zh.mmd', 'flow-task.mmd', 'flow-task_zh.mmd', longName, 'project-release-sequence-with-a-deliberately-long-name.mermaid', '项目发布流程与构建环境的完整说明图.mmd']
const singleLineRow = 36
const nameGapPixels = 4

function nameGeometry(row: Locator) {
  return row.evaluate((element) => {
    const stem = element.querySelector('.tree-name-stem')!
    const ext = element.querySelector('.tree-name-ext')!
    const action = element.closest('.tree-item')!.querySelector('.row-actions')!
    const stemBox = stem.getBoundingClientRect()
    const extBox = ext.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(stem.firstChild!)
    return {
      rowHeight: element.getBoundingClientRect().height,
      stemHeight: stemBox.height,
      extHeight: extBox.height,
      verticalOverflow: stem.scrollHeight - stem.clientHeight,
      truncated: stem.scrollWidth > stem.clientWidth + 1,
      stemText: stem.textContent,
      extText: ext.textContent,
      stemTop: stemBox.top,
      extTop: extBox.top,
      extRight: extBox.right,
      actionLeft: action.getBoundingClientRect().left,
      extGap: extBox.left - range.getBoundingClientRect().right,
    }
  })
}

async function requireSingleLineNames(listing: Locator, folder: string) {
  let truncated = 0
  for (const name of names) {
    const row = listing.locator(`.tree-row[title="${folder}/${name}"]`)
    await expect(row).toBeVisible()
    await expect(listing.getByRole('button', { name, exact: true })).toHaveCount(1)
    const geometry = await nameGeometry(row)
    expect(geometry.stemText! + geometry.extText!).toBe(name)
    expect(geometry.extText).toBe(name.slice(name.lastIndexOf('.')))
    expect(geometry.stemHeight).toBeCloseTo(geometry.extHeight, 0)
    expect(geometry.verticalOverflow).toBeLessThanOrEqual(1)
    expect(geometry.rowHeight).toBe(singleLineRow)
    expect(Math.abs(geometry.extTop - geometry.stemTop)).toBeLessThanOrEqual(1)
    expect(geometry.extRight).toBeLessThanOrEqual(geometry.actionLeft)
    if (geometry.truncated) {
      truncated++
      await expect(row.locator('.tree-name-stem')).toHaveCSS('text-overflow', 'ellipsis')
    }
    else {
      expect(geometry.extGap).toBeLessThanOrEqual(nameGapPixels)
    }
  }
  expect(truncated).toBeGreaterThan(0)
  expect(await listing.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
}

test('explorer rows keep filenames on one line with visible extensions and full names', async ({ page }, info) => {
  const owned = await mkdtemp(join(root, 'name-line-'))
  const folder = relative(root, owned)
  await Promise.all(names.map(name => writeFile(join(owned, name), 'flowchart LR\n  A --> B\n')))
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await browse(page, folder)
    const explorer = page.locator('.workspace-body > .file-tree')
    const listing = explorer.getByRole('navigation', { name: 'Files and diagrams', exact: true })
    const handle = page.getByRole('separator', { name: 'Resize project files', exact: true })
    for (const width of [232, 180, 440]) {
      const current = (await explorer.boundingBox())!.width
      const box = (await handle.boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2 + width - current, box.y + box.height / 2, { steps: 5 })
      await page.mouse.up()
      await expect(explorer).toHaveCSS('width', `${width}px`)
      await requireSingleLineNames(listing, folder)
      await page.screenshot({ path: info.outputPath(`single-line-names-${width}.png`) })
    }
    await listing.getByRole('button', { name: longName, exact: true }).click()
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue('flowchart LR\n  A --> B\n')
    expect(new URL(page.url()).searchParams.get('path')).toBe(`${folder}/${longName}`)
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})

test('explorer row names start at the left of their column and keep their extension beside them', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'name-align-'))
  const folder = relative(root, owned)
  await writeFile(join(owned, 'a.mmd'), 'flowchart LR\n  A --> B\n')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await page.setViewportSize({ width: 390, height: 844 })
    await browse(page, folder)
    const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
    const row = dialog.locator(`.tree-row[title="${folder}/a.mmd"]`)
    await expect(row).toBeVisible()
    const measured = await row.evaluate((element) => {
      const stem = element.querySelector('.tree-name-stem')!
      const ext = element.querySelector('.tree-name-ext')!
      const range = document.createRange()
      range.selectNodeContents(stem.firstChild!)
      const glyphs = range.getBoundingClientRect()
      return { offset: glyphs.left - stem.getBoundingClientRect().left, gap: ext.getBoundingClientRect().left - glyphs.right }
    })
    expect(measured.offset).toBeLessThanOrEqual(1)
    expect(measured.gap).toBeLessThanOrEqual(nameGapPixels)
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})

test('the project-files sheet keeps filenames on one line with visible extensions and full names', async ({ page }, info) => {
  const owned = await mkdtemp(join(root, 'name-line-sheet-'))
  const folder = relative(root, owned)
  await Promise.all(names.map(name => writeFile(join(owned, name), 'flowchart LR\n  A --> B\n')))
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await page.setViewportSize({ width: 390, height: 844 })
    await browse(page, folder)
    const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
    const listing = dialog.getByRole('navigation', { name: 'Files and diagrams', exact: true })
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 })
      await requireSingleLineNames(listing, folder)
      await page.screenshot({ path: info.outputPath(`single-line-names-phone-${width}.png`) })
    }
    await listing.getByRole('button', { name: longName, exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect(new URL(page.url()).searchParams.get('path')).toBe(`${folder}/${longName}`)
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})
