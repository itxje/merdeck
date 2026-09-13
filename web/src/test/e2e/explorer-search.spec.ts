import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('the explorer search finds diagrams in unopened subfolders and opens them', async ({ page }) => {
  const folder = `search-${randomUUID()}`
  await mkdir(join(root, folder, 'mermaid/mesh-v1/deep'), { recursive: true })
  await writeFile(join(root, folder, 'mermaid/mesh-v1/deep/13-relay-gantt.mmd'), 'flowchart LR\n  Relay --> Gantt\n', { flag: 'wx' })
  await writeFile(join(root, folder, 'mermaid/mesh-v1/03-relay-state.mmd'), 'flowchart LR\n  Relay --> State\n', { flag: 'wx' })
  await writeFile(join(root, folder, 'mermaid/unrelated.mmd'), 'flowchart LR\n  A --> B\n', { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    const explorer = page.locator('.workspace-body > .file-tree')
    const box = explorer.getByRole('textbox', { name: 'Filter files' })
    await box.fill('relay')
    const results = explorer.getByRole('navigation', { name: 'Search results' })
    await expect(results.getByRole('button', { name: `${folder}/mermaid/mesh-v1/deep/13-relay-gantt.mmd` })).toBeVisible()
    await expect(results.getByRole('button', { name: `${folder}/mermaid/mesh-v1/03-relay-state.mmd` })).toBeVisible()
    await expect(results.getByRole('button', { name: `${folder}/mermaid/unrelated.mmd` })).toHaveCount(0)
    // The folder listing is set aside while a query is active and returns when it is cleared.
    await expect(explorer.getByRole('navigation', { name: 'Files and diagrams' })).toBeHidden()

    await results.getByRole('button', { name: `${folder}/mermaid/mesh-v1/deep/13-relay-gantt.mmd` }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${folder}/mermaid/mesh-v1/deep/13-relay-gantt.mmd`)
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue('flowchart LR\n  Relay --> Gantt\n')

    await box.fill('')
    await expect(explorer.getByRole('navigation', { name: 'Files and diagrams' })).toBeVisible()
    await expect(results).toHaveCount(0)
  }
  finally {
    await rm(join(root, folder), { recursive: true, force: true })
  }
})
