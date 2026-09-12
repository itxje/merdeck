import type { Locator } from '@playwright/test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// The row's last icon is the entry's own: a folder draws its chevron first, a file only its icon.
function measure(row: Locator) {
  return row.evaluate((element) => {
    const icons = element.querySelectorAll('svg')
    const name = element.querySelector('.truncate')!
    return { icon: icons[icons.length - 1]!.getBoundingClientRect().left, name: name.getBoundingClientRect().left, weight: Number(getComputedStyle(name).fontWeight) }
  })
}

test('the explorer nests every level right of its folder and draws folders apart from files', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'hierarchy-'))
  const top = basename(owned)
  await mkdir(join(owned, 'inner'))
  await writeFile(join(owned, 'sibling.mmd'), 'flowchart LR\n  A --> B\n')
  await writeFile(join(owned, 'inner', 'leaf.mmd'), 'flowchart LR\n  A --> B\n')
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    const folder = explorer.getByRole('button', { name: top, exact: true })
    const inner = explorer.getByRole('button', { name: 'inner', exact: true })
    const sibling = explorer.locator(`button[title="${top}/sibling.mmd"]`)
    const leaf = explorer.locator(`button[title="${top}/inner/leaf.mmd"]`)
    await expect(leaf).toBeVisible()
    await page.mouse.move(900, 600)
    const outer = await measure(folder)
    const middle = await measure(inner)
    const file = await measure(sibling)
    const deepest = await measure(leaf)
    // A child starts to the right of its folder's icon and name at every depth.
    expect(middle.icon).toBeGreaterThan(outer.icon)
    expect(middle.name).toBeGreaterThan(outer.name)
    expect(deepest.icon).toBeGreaterThan(middle.icon)
    expect(deepest.name).toBeGreaterThan(middle.name)
    // A folder and a file at the same depth share the icon and name columns.
    expect(file.icon).toBe(middle.icon)
    expect(file.name).toBe(middle.name)
    expect(outer.weight).toBeGreaterThan(file.weight)
    await expect(folder.locator('svg.lucide-folder-open')).toHaveCount(1)
    await folder.click()
    await expect(folder).toHaveAttribute('aria-expanded', 'false')
    await expect(folder.locator('svg.lucide-folder')).toHaveCount(1)
    await expect(leaf).toBeHidden()
  }
  finally { await rm(owned, { recursive: true, force: true }) }
})
