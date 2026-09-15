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
export async function browse(page: Page, directory: string) {
  const explorer = page.getByRole('dialog', { name: 'Project files', exact: true })
  const scope = await explorer.isVisible() ? explorer : page.getByRole('complementary', { name: 'Project files', exact: true })
  await scope.getByRole('button', { name: 'Root', exact: true }).click()
  await expect(page).toHaveURL(url => url.searchParams.get('directory') === '""' || url.searchParams.get('directory') === '')
  for (const part of directory.split('/').filter(Boolean)) {
    const row = scope.getByRole('navigation', { name: 'Files and diagrams', exact: true }).getByRole('button', { name: part, exact: true })
    await expect(row).toBeVisible()
    await row.click()
  }
}
export async function choose(page: Page, name: string) {
  const file = name === 'overview.md' ? 'docs/overview.md' : name
  if (file.includes('/'))
    await browse(page, file.slice(0, file.lastIndexOf('/')))
  else if (['welcome.mmd', 'sequence.mermaid'].includes(file))
    await browse(page, '')
  const base = file.split('/').at(-1)!
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^${escaped}(?: Unsaved changes)?$`) }).first().click()
  // Markdown opens in its read-only document view; existing source-editor helpers exercise the retained Diagram view.
  const diagram = page.getByRole('tab', { name: 'Diagram', exact: true })
  if (file.endsWith('.md')) {
    await expect(page.getByRole('article', { name: 'Markdown document', exact: true })).toBeVisible()
    await expect(diagram).toBeEnabled()
    await diagram.click()
    await expect(diagram).toHaveAttribute('aria-selected', 'true')
  }
  await expect(page.getByLabel('Mermaid source', { exact: true })).toBeAttached()
  const showSource = page.getByRole('button', { name: 'Show source', exact: true })
  if (await showSource.isVisible()) {
    await showSource.click()
    await expect(showSource).toBeHidden()
  }
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
