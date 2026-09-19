import type { Locator } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { browse, expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

function rect(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return { top: box.top, bottom: box.bottom }
  })
}

// The former heading + breadcrumb + tools row + kinds row + explanatory sentence measured 249px of
// chrome above the first row at the default 232px explorer width and a 1440x900 viewport (not the
// plan's estimated 346px — measured directly, on the pre-rail markup, the same way as below), and fit
// 12 of 60 rows in a 900px-tall viewport. The rail-and-search-frame layout measures both below: 92px of
// chrome (a 157px reduction) and 18 of 60 rows visible (6 more, not the plan's estimated nine — recorded
// here rather than adjusted to match the estimate).
const chromeRange = { min: 80, max: 105 }
const minimumVisibleRows = 18

test('the explorer rail leaves about 92px of chrome above the first row and fits six more rows than the former stack', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'density-'))
  await Promise.all(Array.from({ length: 60 }, (_, index) => writeFile(join(owned, `file-${String(index + 1).padStart(2, '0')}.mmd`), 'flowchart LR\nA-->B\n')))
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await browse(page, basename(owned))
    const explorer = page.locator('.workspace-body > .file-tree')
    const listing = explorer.getByRole('navigation', { name: 'Files and diagrams', exact: true })
    const firstRow = listing.locator('.tree-row').first()
    await expect(firstRow).toBeVisible()
    const explorerBox = await rect(explorer)
    const firstRowBox = await rect(firstRow)
    const chrome = firstRowBox.top - explorerBox.top
    expect(chrome).toBeGreaterThanOrEqual(chromeRange.min)
    expect(chrome).toBeLessThanOrEqual(chromeRange.max)

    const listingBox = await rect(listing)
    const rows = await listing.locator('.tree-row').all()
    const rowBoxes = await Promise.all(rows.map(row => rect(row)))
    // A row counts as visible if any part of it falls inside the listing's own (possibly scroll-clipped) box.
    const visible = rowBoxes.filter(box => box.top < listingBox.bottom - 1 && box.bottom > listingBox.top + 1).length
    expect(visible).toBeGreaterThanOrEqual(minimumVisibleRows)
  }
  finally {
    await rm(owned, { recursive: true, force: true })
  }
})
