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

test('directory navigation preserves folder styling and aligned immediate rows', async ({ page }) => {
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
    await expect(folder).toBeVisible()
    await expect(folder.locator('svg.lucide-folder')).toHaveCount(1)
    await folder.click()
    await expect(inner).toBeVisible()
    await page.mouse.move(900, 600)
    const middle = await measure(inner)
    const file = await measure(sibling)
    expect(file.icon).toBe(middle.icon)
    expect(file.name).toBe(middle.name)
    expect(middle.weight).toBeGreaterThan(file.weight)
    await expect(leaf).toHaveCount(0)
    await inner.click()
    await expect(leaf).toBeVisible()
    await explorer.getByRole('button', { name: 'Up', exact: true }).click()
    await expect(sibling).toBeVisible()
    await expect(leaf).toHaveCount(0)
  }
  finally { await rm(owned, { recursive: true, force: true }) }
})
