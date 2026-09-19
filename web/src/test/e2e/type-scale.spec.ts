import type { Locator, Page } from '@playwright/test'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { browse, choose, expect, live, login, test } from './support'

// The raw --font-mono custom-property text and a computed font-family are not always serialized the
// same way (quoting differs), so compare against another element resolving the same variable.
async function monospaceStack(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('span')
    probe.style.fontFamily = 'var(--font-mono)'
    document.body.append(probe)
    const value = getComputedStyle(probe).fontFamily
    probe.remove()
    return value
  })
}

const steps = [11, 12, 13, 15, 17]
// Rendered document and diagram content keep their own reading scale; everything else is shell chrome.
const exemptSelector = '.document-view, .document-view *, .markdown-document-view, .markdown-document-view *, .html-document-view, .html-document-view *, .label-editor, .label-editor *, .diagram-graphic, .diagram-graphic *'

async function shellFontSteps(page: Page) {
  return page.evaluate(({ allowed, exemptSelector }) => {
    const exempt = new Set(document.querySelectorAll(exemptSelector))
    const offenders: string[] = []
    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      if (exempt.has(element))
        continue
      const style = getComputedStyle(element)
      if (style.display === 'none')
        continue
      const size = Number.parseFloat(style.fontSize)
      if (!Number.isFinite(size))
        continue
      const rounded = Math.round(size)
      if (!allowed.includes(rounded)) {
        const label = element.className && typeof element.className === 'string' ? `.${element.className.trim().replaceAll(/\s+/g, '.')}` : ''
        offenders.push(`${element.tagName.toLowerCase()}${label}: ${size}px`)
      }
    }
    return offenders
  }, { allowed: steps, exemptSelector })
}

test('the application shell renders only the five-step type scale', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  await choose(page, 'welcome.mmd')
  await live(page)
  await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'AI file editor', exact: true })).toBeVisible()
  expect(await shellFontSteps(page)).toEqual([])

  const px = async (locator: Locator) => Number.parseFloat(await locator.evaluate(element => getComputedStyle(element).fontSize))
  await expect.poll(() => px(page.locator('.file-tree .tree-row').first())).toBe(12)
  await expect.poll(() => px(page.locator('.status-bar'))).toBe(12)
  await expect.poll(() => px(page.locator('.tree-bottom').first())).toBe(11)
  await expect.poll(() => px(page.locator('.pane-heading').first())).toBe(15)
  await expect.poll(() => px(page.locator('.header-file h1'))).toBe(15)
  await expect.poll(() => px(page.getByRole('button', { name: /^Save/ }))).toBe(13)

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await shellFontSteps(page)).toEqual([])
})

test('the document reading surface keeps its own type scale outside the shell ramp', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  // Open the Markdown document directly; choose() switches to the Diagram tab, which this test must not do.
  await browse(page, 'docs')
  await page.getByRole('button', { name: 'overview.md', exact: true }).click()
  const body = page.getByRole('article', { name: 'Markdown document', exact: true })
  await expect(body).toBeVisible()
  expect(await body.evaluate(element => getComputedStyle(element).fontSize)).toBe('17px')
})

test('the directory breadcrumb and the assistant attached-file line render in the monospace stack', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  const monospace = await monospaceStack(page)
  const crumb = page.getByRole('navigation', { name: 'Directory breadcrumbs', exact: true }).getByRole('button', { name: 'Root', exact: true })
  expect(await crumb.evaluate(element => getComputedStyle(element).fontFamily)).toBe(monospace)

  await choose(page, 'welcome.mmd')
  await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
  const attachment = page.getByLabel('Attached file', { exact: true })
  await expect(attachment).toBeVisible()
  expect(await attachment.locator('code').evaluate(element => getComputedStyle(element).fontFamily)).toBe(monospace)
})

const openRoot = process.env.MERDECK_OPEN_ROOT
const openUrl = process.env.MERDECK_OPEN_URL
test('the assistant tool and file-change targets render in the monospace stack', async ({ page }) => {
  test.skip(process.env.MERDECK_TEST_AGENTS !== 'true' || !openRoot || !openUrl, 'Set MERDECK_TEST_AGENTS=true, MERDECK_OPEN_URL and MERDECK_OPEN_ROOT to run the fake-provider acceptance.')
  const path = join(openRoot!, 'agent-live.mmd')
  await writeFile(path, 'flowchart LR\nA[Before]-->B[Preview]\n', { flag: 'wx' })
  try {
    await page.goto(openUrl!)
    await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
    await choose(page, 'agent-live.mmd')
    await live(page)
    await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
    const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
    await editor.getByLabel('Agent instruction', { exact: true }).fill('Update the diagram.')
    await editor.getByRole('button', { name: 'Send', exact: true }).click()
    const target = editor.getByRole('log', { name: 'AI conversation', exact: true }).locator('code', { hasText: 'agent-live.mmd' })
    await expect(target).toBeVisible({ timeout: 15000 })
    const monospace = await monospaceStack(page)
    expect(await target.evaluate(element => getComputedStyle(element).fontFamily)).toBe(monospace)
  }
  finally {
    await rm(path, { force: true })
  }
})
