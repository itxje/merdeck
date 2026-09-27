import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

test.use({ trace: 'off' })
const project = process.env.MERDECK_SMOKE_ROOT
if (!project)
  throw new Error('Set an explicit disposable MERDECK_SMOKE_ROOT.')
const root = project
const older = 'f'.repeat(64)

// The first shell carries an older build identity, as a page opened before a redeployment does; later loads are real.
async function openOlderShell(page: Page) {
  let served = false
  await page.route(url => url.pathname === '/' || url.pathname === '/index.html', async (route) => {
    if (served || route.request().resourceType() !== 'document') {
      await route.continue()
      return
    }
    served = true
    const response = await route.fetch()
    const body = (await response.text()).replace(/(<meta name="merdeck-build" content=")[a-f0-9]{64}(">)/, `$1${older}$2`)
    await route.fulfill({ response, body })
  })
}

test('an open page from an older build reloads only when no work would be lost', async ({ page }) => {
  test.setTimeout(90000)
  const original = await readFile(join(root, 'welcome.mmd'), 'utf8')
  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openOlderShell(page)
    await login(page, true)
    expect(await page.locator('meta[name="merdeck-build"]').getAttribute('content')).toBe(older)
    const notice = page.getByRole('complementary', { name: 'Application update' })
    await expect(notice).toContainText('Application update available.')
    const reload = notice.getByRole('button', { name: 'Reload application' })
    await expect(reload).toBeEnabled()
    await choose(page, 'welcome.mmd')
    await live(page)
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await editor.fill(`${await editor.inputValue()}  Save --> Reload[Reload safely]\n`)
    await expect(reload).toBeDisabled()
    await expect(notice).toContainText('before reloading')
    await editor.press('Control+s')
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    await expect(reload).toBeEnabled()
    const checked = page.waitForResponse(response => new URL(response.url()).pathname === '/api/build')
    const reloaded = page.waitForEvent('load')
    await reload.click()
    await reloaded
    await checked
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue(/Reload safely/)
    const current = await page.locator('meta[name="merdeck-build"]').getAttribute('content')
    expect(current).toMatch(/^[a-f0-9]{64}$/)
    expect(current).not.toBe(older)
    await expect(page.getByRole('complementary', { name: 'Application update' })).toHaveCount(0)
  }
  finally {
    await writeFile(join(root, 'welcome.mmd'), original)
  }
})

test('a dismissed update stays hidden', async ({ page }) => {
  await openOlderShell(page)
  await login(page, true)
  const notice = page.getByRole('complementary', { name: 'Application update' })
  await notice.getByRole('button', { name: 'Dismiss update' }).click()
  await expect(notice).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
})
