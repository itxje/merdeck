import type { Locator } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { browse, expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// The names the UI refresh plan's own audit found indistinguishable once middle-truncated: three
// same-stem pairs, one member of each pair carrying a "_zh" suffix, all sharing the .mmd extension,
// plus a trivially short control name. At the default 232px explorer width and a 1440x900 viewport,
// two of the three "_zh" names are long enough to need the stem's second line and two of the three
// short-name/"_zh" pairs still fit on one — measured directly below rather than assumed; only
// flow-decisions_zh.mmd and flow-recovery_zh.mmd wrap here, flow-task_zh.mmd does not.
const names = ['a.mmd', 'flow-decisions.mmd', 'flow-decisions_zh.mmd', 'flow-recovery.mmd', 'flow-recovery_zh.mmd', 'flow-task.mmd', 'flow-task_zh.mmd']
const wraps = new Set(['flow-decisions_zh.mmd', 'flow-recovery_zh.mmd'])

function nameGeometry(row: Locator) {
  return row.evaluate((element) => {
    const stem = element.querySelector('.tree-name-stem')
    const ext = element.querySelector('.tree-name-ext')
    if (!stem || !ext)
      return null
    const stemBox = stem.getBoundingClientRect()
    const extBox = ext.getBoundingClientRect()
    return {
      rowHeight: element.getBoundingClientRect().height,
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

// The sheet is wider than the default 232px explorer, so its wrapping split is measured separately
// rather than assumed to match the desktop case; only the six same-stem names apply here, since the
// trivially short control name is not part of a pair. Measured (not assumed): at 390x844 none of
// the six wrap, including the two the desktop case wraps at 232px (flow-decisions_zh.mmd and
// flow-recovery_zh.mmd) — the sheet's extra width fits every stem on one line, so its split is empty
// rather than the desktop case's two-wrapped-against-the-rest.
const sheetNames = names.slice(1)
const sheetWraps = new Set<string>()

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
      expect(geometry.rowHeight).toBe(wraps.has(name) ? 48 : 34)
    }
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
      expect(geometry.rowHeight).toBe(sheetWraps.has(name) ? 48 : 34)
    }
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})
