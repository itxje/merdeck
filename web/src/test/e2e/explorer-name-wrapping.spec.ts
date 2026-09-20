import type { Locator } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { browse, expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// The names the UI refresh plan's own audit found indistinguishable once middle-truncated: three
// same-stem pairs, one member of each pair carrying a "_zh" suffix, all sharing the .mmd extension,
// plus a trivially short control name.
//
// How many lines each of them needs is a property of the font the browser actually has, not of this
// application: the same names take a different number of lines on a machine with a different font
// set, so listing them here asserts the environment rather than the behaviour. Each row's line
// count is read from the rendered stem instead, and the row is required to grow with it while the
// name stays whole.
const names = ['a.mmd', 'flow-decisions.mmd', 'flow-decisions_zh.mmd', 'flow-recovery.mmd', 'flow-recovery_zh.mmd', 'flow-task.mmd', 'flow-task_zh.mmd']
const singleLineRow = 34
const maximumLines = 3

function nameGeometry(row: Locator) {
  return row.evaluate((element) => {
    const stem = element.querySelector('.tree-name-stem')
    const ext = element.querySelector('.tree-name-ext')
    if (!stem || !ext)
      return null
    const stemBox = stem.getBoundingClientRect()
    const extBox = ext.getBoundingClientRect()
    if (extBox.height <= 0)
      throw new Error('The extension has no line box to measure the stem against')
    return {
      rowHeight: element.getBoundingClientRect().height,
      // The stem is a two-line clamp, so it reports one client rect however many lines it uses. Its
      // height against the extension's, which is always one line in the same font, is the number of
      // lines the browser actually laid the name out on, whatever its font metrics are.
      stemLines: Math.max(1, Math.round(stemBox.height / extBox.height)),
      // A clamped box whose content still overflows it shows an ellipsis; equal scroll and client
      // heights mean every character of the stem actually rendered, not just what fit before a cut.
      stemClipped: stem.scrollHeight - stem.clientHeight > 1,
      stemText: stem.textContent,
      extText: ext.textContent,
      stemTop: stemBox.top,
      extTop: extBox.top,
    }
  })
}

// Only the six same-stem names apply in the sheet, since the trivially short control name is not
// part of a pair. The sheet is wider than the default 232px explorer, so fewer stems need a second
// line there, and how many is again a property of the font rather than of this application: the
// same rule applies, the row height follows the line count the browser produced.
const sheetNames = names.slice(1)

test('explorer rows wrap distinguishable same-stem names and hold the extension on the first line', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'name-wrap-'))
  const folder = relative(root, owned)
  await Promise.all(names.map(name => writeFile(join(owned, name), 'flowchart LR\n  A --> B\n')))
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await browse(page, folder)
    const explorer = page.locator('.workspace-body > .file-tree')
    const listing = explorer.getByRole('navigation', { name: 'Files and diagrams', exact: true })

    let wrapped = 0
    const heights = new Map<number, number>()
    for (const name of names) {
      const row = listing.locator(`.tree-row[title="${folder}/${name}"]`)
      await expect(row).toBeVisible()
      // Distinguishable: this exact name resolves to exactly the row that owns it, not an ellipsis two
      // of these names would otherwise share.
      await expect(listing.getByRole('button', { name, exact: true })).toHaveCount(1)
      const geometry = await nameGeometry(row)
      if (!geometry)
        throw new Error(`Row for ${name} is missing the wrapped-name markup`)
      expect(geometry.stemText! + geometry.extText!).toBe(name)
      expect(geometry.stemClipped).toBe(false)
      expect(geometry.extText).toBe('.mmd')
      expect(Math.abs(geometry.extTop - geometry.stemTop)).toBeLessThanOrEqual(1)
      expect(geometry.stemLines).toBeLessThanOrEqual(maximumLines)
      heights.set(geometry.stemLines, geometry.rowHeight)
      wrapped += geometry.stemLines > 1 ? 1 : 0
    }
    // A single-line row is the height the explorer's density depends on; a row that took more lines
    // is taller, without this check reconstructing by how much from padding and line height.
    expect(heights.get(1)).toBe(singleLineRow)
    for (const [lines, height] of [...heights].sort((a, b) => a[0] - b[0]).slice(1))
      expect(height).toBeGreaterThan(heights.get(lines - 1)!)
    // The wrapped shape is exercised, not merely allowed: at this width the long "_zh" names are why
    // the plan named them, and a layout that truncated instead would leave every row on one line.
    expect(wrapped).toBeGreaterThan(0)
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})

test('explorer row names start at the left of their column however wide the row is', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'name-align-'))
  const folder = relative(root, owned)
  await writeFile(join(owned, 'a.mmd'), 'flowchart LR\n  A --> B\n')
  try {
    // The sheet is far wider than any of these names, so a row that centres its text shows it in the
    // middle of an empty column. The row is a button, and a button's text centres by default.
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await page.setViewportSize({ width: 390, height: 844 })
    await browse(page, folder)
    const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
    const row = dialog.locator(`.tree-row[title="${folder}/a.mmd"]`)
    await expect(row).toBeVisible()
    const offset = await row.evaluate((element) => {
      const stem = element.querySelector('.tree-name-stem')!
      const text = stem.firstChild!
      const range = document.createRange()
      range.selectNodeContents(text)
      // Where the glyphs actually start, against the box they sit in: equal means left-aligned.
      return range.getBoundingClientRect().left - stem.getBoundingClientRect().left
    })
    expect(offset).toBeLessThanOrEqual(1)
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})

test('the project-files sheet wraps distinguishable same-stem names and holds the extension on the first line', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'name-wrap-sheet-'))
  const folder = relative(root, owned)
  await Promise.all(sheetNames.map(name => writeFile(join(owned, name), 'flowchart LR\n  A --> B\n')))
  try {
    // Signing in happens at the shared wide-viewport session before narrowing to the sheet, the way
    // every other spec in this suite establishes a session, since the header's own sign-out control
    // is what confirms a session started and it only sits in the header above the phone breakpoint.
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await page.setViewportSize({ width: 390, height: 844 })
    await browse(page, folder)
    const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
    await expect(dialog).toBeVisible()
    const listing = dialog.getByRole('navigation', { name: 'Files and diagrams', exact: true })

    for (const name of sheetNames) {
      const row = listing.locator(`.tree-row[title="${folder}/${name}"]`)
      await expect(row).toBeVisible()
      // Distinguishable: this exact name resolves to exactly the row that owns it, not an ellipsis two
      // of these names would otherwise share.
      await expect(listing.getByRole('button', { name, exact: true })).toHaveCount(1)
      const geometry = await nameGeometry(row)
      if (!geometry)
        throw new Error(`Row for ${name} is missing the wrapped-name markup`)
      // The full name is present with nothing clipped and no ellipsis, the extension held unsplit
      // on the stem's first line, whatever the sheet's own wrapping split turns out to be.
      expect(geometry.stemText! + geometry.extText!).toBe(name)
      expect(geometry.stemClipped).toBe(false)
      expect(geometry.extText).toBe('.mmd')
      expect(Math.abs(geometry.extTop - geometry.stemTop)).toBeLessThanOrEqual(1)
      expect(geometry.stemLines).toBeLessThanOrEqual(maximumLines)
      expect(geometry.rowHeight).toBeGreaterThanOrEqual(singleLineRow)
      if (geometry.stemLines === 1)
        expect(geometry.rowHeight).toBe(singleLineRow)
    }
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})
