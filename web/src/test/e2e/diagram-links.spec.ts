import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('a node that names a project file opens it, and a missing target only explains itself', async ({ page }) => {
  const target = `linked-target-${randomUUID()}.mmd`
  const index = `linked-index-${randomUUID()}.mmd`
  await writeFile(join(root, target), 'flowchart LR\n  Target[Opened] --> Done\n', { flag: 'wx' })
  await writeFile(join(root, index), `flowchart TB\n  A1["Architecture"] --> B1["Missing"]\n  click A1 "${target}"\n  click B1 "linked-absent.mmd"\n`, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await choose(page, index)
    await live(page)
    const linked = page.locator('.diagram-graphic [data-file-link]').first()
    await expect(linked).toHaveAttribute('aria-label', `Open ${target}`)
    await expect(page.locator('.diagram-graphic [data-file-link]')).toHaveCount(2)

    // A target that is not in the project explains itself and leaves the diagram alone. The keyboard
    // path is the one a reader without a pointer takes.
    await page.locator('.diagram-graphic [data-file-link="linked-absent.mmd"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: 'That file is not in this project.' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(index)

    await linked.locator('rect').first().click({ position: { x: 4, y: 4 } })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target)
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue('flowchart LR\n  Target[Opened] --> Done\n')
  }
  finally {
    await rm(join(root, index), { force: true })
    await rm(join(root, target), { force: true })
  }
})
