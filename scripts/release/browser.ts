import { chromium, expect } from '@playwright/test'
import { privateToken } from '../test-support'

export async function lazyBrowser(origin: string, tokenFile: string, screenshot: string) {
  const token = await privateToken(tokenFile)
  const browser = await chromium.launch({ headless: true })
  const resources = new Set<string>()
  const errors: string[] = []
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })
    page.on('pageerror', () => errors.push('page error'))
    page.on('console', (message) => {
      if (message.type() === 'error')
        errors.push('console error')
    })
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (url.origin !== origin)
        errors.push('external request')
      resources.add(url.pathname)
    })
    page.on('response', (response) => {
      if (response.status() >= 400)
        errors.push(`HTTP ${response.status()}`)
    })
    await page.goto(origin)
    await page.getByLabel('Access token', { exact: true }).fill(token)
    await page.getByRole('button', { name: 'Connect to project' }).click()
    await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'welcome.mmd', exact: true }).click()
    const showSource = page.getByRole('button', { name: 'Show source', exact: true })
    if (await showSource.isVisible())
      await showSource.click()
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await expect(editor).toBeVisible()
    const diagrams = [
      { name: 'flowchart', source: 'flowchart LR\n  Binary --> Embedded\n', text: 'Embedded' },
      { name: 'sequence', source: 'sequenceDiagram\n  Client->>Server: Embedded message\n', text: 'Embedded message' },
      { name: 'class', source: 'classDiagram\n  class EmbeddedClass\n', text: 'EmbeddedClass' },
      { name: 'state', source: 'stateDiagram-v2\n  [*] --> EmbeddedState\n', text: 'EmbeddedState' },
    ]
    for (const diagram of diagrams) {
      await editor.fill(diagram.source)
      await expect(page.locator('.diagram-graphic svg')).toContainText(diagram.text)
      await expect(page.getByText('Live preview', { exact: true })).toBeVisible()
    }
    await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' })
    expect(errors).toEqual([])
    return { diagrams: diagrams.map(item => item.name), resourcePaths: [...resources].sort(), unexpectedErrors: errors.length, externalRequests: 0 }
  }
  catch (error) {
    throw new Error((error instanceof Error ? error.message : 'Lazy browser verification failed').replaceAll(token, '<redacted>'))
  }
  finally { await browser.close() }
}
