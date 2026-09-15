import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chooseBlock, expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('complete Markdown remains inert, navigable, responsive, and byte-preserving', async ({ page }) => {
  test.setTimeout(90000)
  const suffix = randomUUID()
  const name = `markdown-document-${suffix}.md`
  const target = `markdown-target-${suffix}.md`
  const path = join(root, name)
  const targetPath = join(root, target)
  const first = 'flowchart LR\nFirst --> Arrow\n'
  const second = 'flowchart LR\nSecond --> Arrow\n'
  const prefix = `\uFEFF# Complete document\r\n\r\nA paragraph with [external](https://example.test/safe), [section](#complete-document), and [project](./${target}).\r\n\r\n[bad](javascript:alert(1)) [escape](../outside.md) [encoded](%2e%2e/secret.md)\r\n\r\n| Name | Value |\r\n| :--- | ---: |\r\n| prose | 2 |\r\n\r\n![remote](https://example.test/remote.png)\r\n\r\n<script>window.markdownPwned = true</script>\r\n<img src="https://example.test/onerror.png" onerror="window.markdownPwned = true">\r\n<iframe src="https://example.test/frame"></iframe>\r\n\r\n\`\`\`mermaid\r\n`
  const middle = '```\r\n\r\nUnrelated CRLF prose.\r\n\r\n```mermaid\r\n'
  const ending = '```\r\n'
  const initial = prefix + first + middle + second + ending
  await writeFile(path, initial, { flag: 'wx' })
  await writeFile(targetPath, '# Linked target\r\n\r\nOnly prose.\r\n', { flag: 'wx' })
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'PUT' && new URL(request.url()).pathname === '/api/diagrams/source')
      writes.push(request.postData() ?? '')
  })
  try {
    await page.setViewportSize({ width: 1440, height: 920 })
    await login(page)
    await page.getByRole('button', { name, exact: true }).click()
    const article = page.getByRole('article', { name: 'Markdown document', exact: true })
    await expect(article).toContainText('A paragraph with')
    await expect(article.getByRole('table')).toBeVisible()
    await expect(article.locator('img, iframe, script')).toHaveCount(0)
    await expect(article).toContainText('<script>window.markdownPwned = true</script>')
    await expect(article.getByText('Image:remote (https://example.test/remote.png)', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => Reflect.has(window, 'markdownPwned'))).toBe(false)
    const external = article.getByRole('link', { name: 'external', exact: true })
    await expect(external).toHaveAttribute('href', 'https://example.test/safe')
    await expect(external).toHaveAttribute('target', '_blank')
    await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(article.getByRole('link', { name: 'bad', exact: true })).toHaveCount(0)
    await expect(article.getByRole('link', { name: 'escape', exact: true })).toHaveCount(0)
    await expect(article.getByRole('link', { name: 'encoded', exact: true })).toHaveCount(0)
    await expect(article.locator('.document-diagram svg')).toHaveCount(2)
    await expect(article.locator('.document-diagram svg marker')).not.toHaveCount(0)
    expect(await article.locator('.document-diagram').evaluateAll((figures) => {
      const [first, second] = figures as HTMLElement[]
      return !!first && !!second
        && getComputedStyle(first.querySelector('.diagram-graphic')!).position === 'static'
        && first.getBoundingClientRect().bottom <= second.getBoundingClientRect().top
    })).toBe(true)
    await expect(article.locator('.document-diagram .diagram-graphic [data-file-link]')).toHaveCount(0)

    await article.getByRole('button', { name: 'project', exact: true }).click()
    await expect(page.getByRole('article', { name: 'Markdown document', exact: true })).toContainText('Linked target')
    await page.getByRole('button', { name, exact: true }).click()
    await expect(article).toContainText('Complete document')

    await chooseBlock(page, name, 2)
    await expect(page.getByRole('tab', { name: 'Document', exact: true })).toHaveAttribute('aria-selected', 'true')
    const secondFigure = article.locator('.document-diagram').nth(1)
    await expect(secondFigure).toHaveClass(/selected/)
    await expect(secondFigure.getByRole('button', { name: 'Select Diagram 2', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(secondFigure.locator('svg')).toBeVisible()
    await expect(secondFigure.locator('button [data-file-link], [role="button"] [data-file-link]')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Diagram', exact: true }).click()
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const showSource = page.getByRole('button', { name: 'Show source', exact: true })
    if (await showSource.isVisible())
      await showSource.click()
    await expect(editor).toHaveValue(second)
    const updated = 'flowchart LR\nSecond --> Saved\n'
    await editor.fill(updated)
    const response = page.waitForResponse(item => item.request().method() === 'PUT' && new URL(item.url()).pathname === '/api/diagrams/source')
    await page.getByRole('button', { name: /^Save/ }).click()
    expect((await response).status()).toBe(200)
    expect(JSON.parse(writes[0] ?? '{}')).toMatchObject({ path: name, source: updated, selector: { kind: 'markdown' } })
    expect(await readFile(path, 'utf8')).toBe(prefix + first + middle + updated + ending)
    const returned = await (await page.request.get(`/api/diagrams/document?path=${encodeURIComponent(name)}`)).json()
    expect(returned.data.text).toBe((prefix + first + middle + updated + ending).slice(1))

    await page.getByRole('tab', { name: 'Document', exact: true }).click()
    await expect(secondFigure.locator('svg')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('html')).not.toHaveClass('dark')
    await expect(article).toContainText('Complete document')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
    await expect(page.locator('html')).toHaveClass('dark')
    await expect(secondFigure.locator('svg')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.reload()
    await expect(page.getByRole('article', { name: 'Markdown document', exact: true }).locator('.document-diagram').nth(1).locator('svg')).toBeVisible()
    expect(await readFile(path, 'utf8')).toBe(prefix + first + middle + updated + ending)
  }
  finally {
    await rm(path, { force: true })
    await rm(targetPath, { force: true })
  }
})
