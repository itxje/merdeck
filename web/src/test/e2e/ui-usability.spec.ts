import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, mockAgentCapabilities, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('default explorer width leaves room to search and read directory breadcrumbs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  const explorer = page.locator('.workspace-body > .file-tree')
  expect((await explorer.getByRole('textbox', { name: 'Filter files' }).boundingBox())!.width).toBeGreaterThanOrEqual(130)
  expect((await explorer.getByRole('navigation', { name: 'Directory breadcrumbs' }).boundingBox())!.width).toBeGreaterThanOrEqual(150)
  await expect(explorer.getByRole('button', { name: 'Next page' })).toHaveCount(0)
})

test('phone editing names the selected document diagram and shows successful saves', async ({ page }, info) => {
  const name = `edit-context-${randomUUID()}.md`
  const file = join(root, name)
  const text = '# Editing guide\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n## Second\n\n```mermaid\nsequenceDiagram\nA->>B: Second diagram\n```\n'
  await writeFile(file, text, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, true)
    await page.goto(`/?path=${encodeURIComponent(name)}`)
    const article = page.getByRole('article', { name: 'Markdown document' })
    const edit = article.getByRole('button', { name: 'Edit diagram 2', exact: true })
    await edit.scrollIntoViewIfNeeded()
    await edit.click()
    const source = page.getByLabel('Mermaid source', { exact: true })
    await expect(source).toBeVisible()
    await expect(source).toHaveValue('sequenceDiagram\nA->>B: Second diagram\n')
    await expect(page.locator('.source-context')).toContainText('Diagram 2')
    expect(await source.evaluate(e => getComputedStyle(e).fontSize)).toBe('16px')
    await source.fill('sequenceDiagram\nA->>B: Updated second diagram\n')
    await expect(page.locator('.save-status')).toBeVisible()
    await expect(page.locator('.save-status')).toContainText('Unsaved')
    await page.screenshot({ path: info.outputPath('phone-editing-context.png'), animations: 'disabled' })
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.save-status')).toContainText('Saved')
    await expect(page.locator('.save-status')).toBeVisible()
    const saved = await readFile(file, 'utf8')
    expect(saved).toContain('flowchart LR\nA-->B\n')
    expect(saved).toContain('Updated second diagram')
  }
  finally {
    await rm(file, { force: true })
  }
})

for (const format of ['markdown', 'html'] as const) {
  test(`${format} contents highlights the actual article section and restores it in the phone drawer`, async ({ page }) => {
    const name = `current-section-${randomUUID()}.${format === 'html' ? 'html' : 'md'}`
    const file = join(root, name)
    const chapters = Array.from({ length: 18 }, (_, index) => index + 1)
    const prose = 'Keep this section readable. '.repeat(12)
    const text = format === 'html'
      ? `<nav><ul>${chapters.map(i => `<li><a href="#chapter-${i}">Chapter ${i}</a></li>`).join('')}</ul></nav><main>${chapters.map(i => `<h2 id="chapter-${i}">Chapter ${i}</h2><p>${prose}</p>`).join('')}</main>`
      : chapters.map(i => `## Chapter ${i}\n\n${prose}`).join('\n\n')
    await writeFile(file, text, { flag: 'wx' })
    try {
      await page.setViewportSize({ width: 1440, height: 900 })
      await login(page, true)
      await page.goto(`/?path=${encodeURIComponent(name)}`)
      const article = page.getByRole('article', { name: format === 'html' ? 'HTML document' : 'Markdown document' })
      await expect(article.getByRole('heading', { name: 'Chapter 1', exact: true })).toBeVisible()
      const contents = page.locator('.document-reader > .document-reader-contents')
      await contents.getByRole('button', { name: 'Chapter 12', exact: true }).click()
      await expect(contents.getByRole('button', { name: 'Chapter 12', exact: true })).toHaveAttribute('aria-current', 'location')
      await article.getByRole('heading', { name: 'Chapter 15', exact: true }).evaluate(e => e.scrollIntoView({ block: 'start' }))
      await expect(contents.getByRole('button', { name: 'Chapter 15', exact: true })).toHaveAttribute('aria-current', 'location')
      await page.setViewportSize({ width: 390, height: 400 })
      await article.getByRole('heading', { name: 'Chapter 18', exact: true }).evaluate(e => e.scrollIntoView({ block: 'start' }))
      await page.getByRole('button', { name: 'Open contents' }).click()
      const drawer = page.getByRole('dialog', { name: 'Contents', exact: true })
      const current = drawer.locator('[aria-current="location"]')
      await expect(current).toHaveText('Chapter 18')
      await expect.poll(async () => {
        const item = (await current.boundingBox())!
        const rail = (await drawer.locator('.document-reader-contents').boundingBox())!
        return item.y >= rail.y && item.y + item.height <= rail.y + rail.height
      }).toBe(true)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Open contents' })).toBeFocused()
    }
    finally {
      await rm(file, { force: true })
    }
  })
}

test('unconfigured editing gives a compact notice without reducing document width', async ({ page }, info) => {
  await page.route('**/api/agents/capabilities', route => route.fulfill({ json: { success: true, data: { enabled: false, providers: [] } } }))
  await page.addInitScript(() => localStorage.removeItem('merdeck-agent-open'))
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  const notice = page.getByRole('complementary', { name: 'AI file editor', exact: true })
  await expect(notice).toContainText('AI editing is not configured')
  const editor = page.locator('.editor-workspace')
  const width = (await editor.boundingBox())!.width
  await notice.getByRole('button', { name: 'Close AI file editor' }).click()
  expect((await editor.boundingBox())!.width).toBe(width)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open AI file editor' }).click()
  await expect(notice).toBeVisible()
  expect((await notice.boundingBox())!.height).toBeLessThanOrEqual(120)
  await page.screenshot({ path: info.outputPath('compact-unconfigured-phone.png'), animations: 'disabled' })
})

test('streamed Markdown follows the bottom and respects reading earlier replies', async ({ page }, info) => {
  await mockAgentCapabilities(page)
  await page.addInitScript(() => {
    let eventId = 0
    class Stream extends EventTarget {
      static readonly CLOSED = 2
      readonly readyState = 1
      receive = (event: Event) => {
        const text = (event as CustomEvent<string>).detail
        this.dispatchEvent(new MessageEvent('assistant.delta', { data: JSON.stringify({ id: ++eventId, type: 'assistant.delta', text }) }))
      }

      constructor() {
        super()
        window.addEventListener('test-agent-delta', this.receive)
      }

      close() { window.removeEventListener('test-agent-delta', this.receive) }
    }
    Object.assign(window, { EventSource: Stream })
    sessionStorage.setItem('merdeck-agent-session', JSON.stringify({ conversation: { id: 'a'.repeat(48), provider: 'codex', model: 'default' }, selection: null, state: { active: false, lastEventId: 0, items: [{ key: 'reply', kind: 'assistant', text: `# Review\n\n${'An earlier paragraph.\n\n'.repeat(35)}` }] } }))
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  await page.getByRole('button', { name: 'Open AI file editor' }).click()
  const log = page.getByRole('log', { name: 'AI conversation' })
  const gap = () => log.evaluate(e => e.scrollHeight - e.clientHeight - e.scrollTop)
  await expect(log.getByRole('heading', { name: 'Review' })).toHaveCount(1)
  await expect.poll(gap).toBeLessThanOrEqual(1)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-agent-delta', { detail: `**Streamed text.**\n\n${'More content.\n\n'.repeat(40)}` })))
  await expect(log.getByText('Streamed text.', { exact: true })).toHaveCount(1)
  await expect.poll(gap).toBeLessThanOrEqual(1)
  await log.evaluate(e => e.scrollTo({ top: 40 }))
  await expect.poll(() => log.evaluate(e => e.scrollTop)).toBe(40)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-agent-delta', { detail: `Unread content.\n\n${'Newest paragraph.\n\n'.repeat(30)}\`\`\`ts\nconst answer = 42\n\`\`\`` })))
  await expect(log.getByText('Unread content.', { exact: true })).toHaveCount(1)
  expect(await log.evaluate(e => e.scrollTop)).toBe(40)
  await page.getByRole('button', { name: 'View latest content' }).click()
  await expect.poll(gap).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'View latest content' })).toHaveCount(0)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await log.getByRole('button', { name: 'Copy code' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('const answer = 42')
  await page.setViewportSize({ width: 1440, height: 700 })
  await expect.poll(gap).toBeLessThanOrEqual(1)
  await page.setViewportSize({ width: 390, height: 640 })
  await expect.poll(gap).toBeLessThanOrEqual(1)
  await page.screenshot({ path: info.outputPath('streamed-reply-phone.png'), animations: 'disabled' })
})
