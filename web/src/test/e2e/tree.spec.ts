import { mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('loading and an actually empty project remain understandable', async ({ page }) => {
  const held = join(root, '.acceptance-held')
  await mkdir(held)
  const moved: string[] = []
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    for (const name of ['docs', 'welcome.mmd', 'sequence.mermaid']) {
      await rename(join(root, name), join(held, name))
      moved.push(name)
    }
    await page.route('**/api/diagrams/tree', async (route) => {
      await gate
      await route.continue()
    }, { times: 1 })
    await login(page)
    await expect(page.getByText('Reading project files…', { exact: true })).toBeVisible()
    release()
    await expect(page.getByText('No supported files in this project', { exact: true })).toBeVisible({ timeout: 12000 })
    await expect(page.getByRole('heading', { name: 'Choose a diagram', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh files', exact: true })).toBeEnabled()
  }
  finally {
    release()
    for (const name of moved)
      await rename(join(held, name), join(root, name))
    await rm(held, { recursive: true })
  }
})

test('an advertised partial tree cannot discard the selected dirty document', async ({ page }) => {
  await login(page)
  await choose(page, 'welcome.mmd')
  const editor = page.getByLabel('Mermaid source', { exact: true })
  await expect(editor).toBeVisible()
  const draft = 'flowchart LR\n  Retain --> Draft\n'
  await editor.fill(draft)
  // Inject transport truncation while retaining a real revision endpoint and document.
  await page.route('**/api/diagrams/tree', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    await route.fulfill({ response, json: { ...body, data: { ...body.data, entries: [], truncated: true } } })
  })
  await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
  await expect(page.getByText('Partial file list. Select known files directly.', { exact: true })).toBeVisible()
  await expect(editor).toHaveValue(draft)
  await expect(page.getByText('RETAINED DRAFTS', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
})
