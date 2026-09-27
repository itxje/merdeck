import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, test } from './support'

test.use({ trace: 'off' })
const url = process.env.MERDECK_OPEN_URL
const root = process.env.MERDECK_OPEN_ROOT
// The browser gate starts this service itself; separately started services may not provide one.
test.skip(!url || !root, 'Set MERDECK_OPEN_URL and MERDECK_OPEN_ROOT to a disposable service without an access token.')

test('opens the workspace without an access token and saves through it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(url!)
  const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
  await expect(explorer).toBeVisible()
  await expect(page.getByText('Open access', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Access token', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open AI file editor', exact: true })).toBeVisible()
  await choose(page, 'welcome.mmd')
  await live(page)
  const editor = page.getByLabel('Mermaid source', { exact: true })
  await editor.fill(`${await editor.inputValue()}  Save --> Open[Open access]\n`)
  await editor.press('Control+s')
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  expect(await readFile(join(root!, 'welcome.mmd'), 'utf8')).toContain('Save --> Open[Open access]')
  await page.reload()
  await expect(explorer).toBeVisible()
  await expect(page.getByLabel('Access token', { exact: true })).toHaveCount(0)
  expect(await page.context().cookies()).toEqual([])
})
