import type { BrowserContext, Page } from '@playwright/test'
import { readFile, stat } from 'node:fs/promises'
import { test as base, expect } from '@playwright/test'

interface Audit {
  allowHttp: (status: number, path: string) => void
  offline: boolean
}
export const test = base.extend<{ audit: Audit }>({
  audit: [async ({ page }, use, info) => {
    const errors: string[] = []
    const allowed = new Set<string>()
    const audit: Audit = { allowHttp: (status, path) => allowed.add(`${status} ${path}`), offline: false }
    const origins = [process.env.MERDECK_TEST_URL, process.env.MERDECK_UNSUPPORTED_URL, process.env.MERDECK_OPEN_URL]
    page.on('pageerror', error => errors.push(`Page error: ${error.name}`))
    page.on('dialog', async (dialog) => {
      errors.push(`Unexpected browser ${dialog.type()} dialog`)
      await dialog.dismiss()
    })
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!origins.includes(url.origin))
        errors.push('Unexpected outbound resource request')
    })
    page.on('response', (response) => {
      if (response.status() >= 400 && !allowed.has(`${response.status()} ${new URL(response.url()).pathname}`))
        errors.push(`Unexpected HTTP ${response.status()} ${new URL(response.url()).pathname}`)
    })
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? ''
      if (reason === 'net::ERR_ABORTED' || (audit.offline && reason === 'net::ERR_INTERNET_DISCONNECTED'))
        return
      errors.push(`Unexpected network failure: ${reason}`)
    })
    page.on('console', (message) => {
      if (message.type() !== 'error')
        return
      const resource = /^Failed to load resource: the server responded with a status of (\d+)/.exec(message.text())
      const location = message.location().url
      if (resource && URL.canParse(location) && allowed.has(`${resource[1]} ${new URL(location).pathname}`))
        return
      if (audit.offline && message.text().includes('net::ERR_INTERNET_DISCONNECTED'))
        return
      errors.push('Unexpected browser console error')
    })
    await use(audit)
    expect(errors, 'Unexpected browser errors; credentials are deliberately omitted').toEqual([])
    process.stdout.write(`${JSON.stringify({ browserAudit: info.title, unexpectedErrors: errors.length })}\n`)
  }, { auto: true }],
})
export { expect } from '@playwright/test'

let sessionCookies: Awaited<ReturnType<BrowserContext['cookies']>> = []
export async function login(page: Page, reuseSession = false) {
  const path = process.env.MERDECK_SMOKE_TOKEN_FILE
  if (!path || ((await stat(path)).mode & 0o077) !== 0)
    throw new Error('An owner-only test token file is required')
  if (reuseSession && sessionCookies.length) {
    await page.context().addCookies(sessionCookies)
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
    return
  }
  await page.goto('/index.html')
  await expect(page).toHaveURL(url => url.pathname === '/')
  await page.getByLabel('Access token', { exact: true }).fill((await readFile(path, 'utf8')).trim())
  await page.getByRole('button', { name: 'Connect to project' }).click()
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
  if (reuseSession)
    sessionCookies = await page.context().cookies()
}
export async function choose(page: Page, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^${escaped}(?: Unsaved changes)?$`) }).first().click()
  await expect(page.getByLabel('Mermaid source', { exact: true })).toBeAttached()
  const showSource = page.getByRole('button', { name: 'Show source', exact: true })
  if (await showSource.isVisible())
    await showSource.click()
  await expect(page.getByLabel('Mermaid source', { exact: true })).toBeVisible()
}
export async function chooseBlock(page: Page, file: string, number: number) {
  const row = page.getByRole('list', { name: `Diagrams in ${file}`, exact: true }).getByRole('button').nth(number - 1)
  await row.click()
  await expect(row).toHaveAttribute('aria-current', 'true')
}
export async function live(page: Page) {
  await expect(page.getByText('Live preview', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.diagram-graphic svg')).toBeVisible()
}
export async function settledDialog(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.evaluate(async (element) => {
    const nodes: Element[] = []
    for (let node: Element | null = element; node; node = node.parentElement)
      nodes.push(node)
    await Promise.all(nodes.flatMap(node => node.getAnimations()).map(animation => animation.finished))
  })
  expect(await dialog.evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (getComputedStyle(node).opacity !== '1')
        return false
    }
    return element.getBoundingClientRect().width <= innerWidth
  })).toBe(true)
}
