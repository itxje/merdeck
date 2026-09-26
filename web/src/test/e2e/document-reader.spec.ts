import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

for (const format of ['html', 'markdown'] as const) {
  test(`${format} reader separates contents scrolling and offers an accessible narrow drawer`, async ({ page }, info) => {
    const chapters = Array.from({ length: 30 }, (_, index) => ({ id: `chapter-${index + 1}`, title: `Chapter ${index + 1}` }))
    const prose = 'Read the document while its contents stay available. Follow the next chapter for more detail.'
    const source = format === 'html'
      ? `<!doctype html><nav><ul>${chapters.map(c => `<li><a href="#${c.id}">${c.title}</a></li>`).join('')}</ul></nav><main><h1>Reader guide</h1>${chapters.map(c => `<h2 id="${c.id}">${c.title}</h2><p>${prose}</p>`).join('')}</main>`
      : `# Reader guide\n\n${chapters.map(c => `## ${c.title}\n\n${prose}`).join('\n\n')}`
    const name = `reader-${randomUUID()}.${format === 'html' ? 'html' : 'md'}`
    const path = join(root, name)
    await writeFile(path, source, { flag: 'wx' })
    try {
      await page.setViewportSize({ width: 1440, height: 920 })
      await login(page)
      await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
      await page.getByRole('button', { name, exact: true }).click()
      const article = page.getByRole('article', { name: format === 'html' ? 'HTML document' : 'Markdown document', exact: true })
      await expect(article.getByRole('heading', { name: 'Reader guide', exact: true })).toBeVisible()
      const rail = page.locator('.document-reader > .document-reader-contents')
      await expect(rail).toBeVisible()
      const railBox = await rail.boundingBox()
      const articleBox = await article.boundingBox()
      expect(railBox!.y).toBeCloseTo(articleBox!.y, 0)
      expect(railBox!.height).toBeCloseTo(articleBox!.height, 0)
      await article.evaluate(el => el.scrollTo(0, 500))
      await rail.evaluate(el => el.scrollTo(0, 180))
      expect(await article.evaluate(el => el.scrollTop)).toBe(500)
      expect(await rail.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      const toggle = page.getByRole('button', { name: 'Toggle contents', exact: true })
      await toggle.click()
      await expect(rail).toHaveCount(0)
      expect(await article.evaluate(el => el.scrollTop)).toBe(500)
      await toggle.click()
      await expect(rail).toBeVisible()

      await page.setViewportSize({ width: 390, height: 844 })
      const open = page.getByRole('button', { name: 'Open contents', exact: true })
      await expect(open).toBeVisible()
      await expect(rail).toHaveCount(0)
      await open.click()
      const drawer = page.getByRole('dialog', { name: 'Contents', exact: true })
      await expect(drawer).toBeVisible()
      await expect(drawer).toHaveCSS('opacity', '1')
      await page.screenshot({ path: info.outputPath(`${format}-contents-open.png`) })
      const title = drawer.getByRole('heading', { name: 'Contents', exact: true })
      const first = drawer.getByRole('button', { name: 'Chapter 1', exact: true })
      await expect(title).toBeVisible()
      await expect(first).toBeVisible()
      const titleBox = await title.boundingBox()
      const firstBox = await first.boundingBox()
      expect(titleBox).not.toBeNull()
      expect(firstBox).not.toBeNull()
      expect(firstBox!.x).toBeGreaterThanOrEqual(0)
      expect(firstBox!.x + firstBox!.width).toBeLessThanOrEqual(390)
      expect(await title.evaluate(el => document.elementFromPoint(el.getBoundingClientRect().left + 4, el.getBoundingClientRect().top + 4)?.closest('[role="dialog"]') === el.closest('[role="dialog"]'))).toBe(true)
      await page.keyboard.press('Escape')
      await expect(drawer).toHaveCount(0)
      await expect(open).toBeFocused()
      await open.click()
      await drawer.getByRole('button', { name: 'Chapter 30', exact: true }).click()
      await expect(drawer).toHaveCount(0)
      await expect(article.getByRole('heading', { name: 'Chapter 30', exact: true })).toBeInViewport()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await readFile(path, 'utf8')).toBe(source)
    }
    finally {
      await rm(path, { force: true })
    }
  })
}

for (const format of ['html', 'markdown'] as const) {
  test(`${format} reader aligns wide prose and tables with contained narrow scrolling`, async ({ page }, info) => {
    const token = 'UnbrokenCell'.repeat(10)
    const source = format === 'html'
      ? `<main><h1>Width guide</h1><p>Prose and tables share the same reading width.</p><table><thead><tr><th>Project</th><th>Scope</th></tr></thead><tbody><tr><td>Example</td><td>Readable content</td></tr></tbody></table><h2>Wide data</h2><table><thead><tr><th>First</th><th>Second</th></tr></thead><tbody><tr><td>${token}</td><td>${token}</td></tr></tbody></table></main>`
      : `# Width guide\n\nProse and tables share the same reading width.\n\n| Project | Scope |\n| --- | --- |\n| Example | Readable content |\n\n## Wide data\n\n| First | Second |\n| --- | --- |\n| ${token} | ${token} |`
    const name = `reader-width-${randomUUID()}.${format === 'html' ? 'html' : 'md'}`
    const path = join(root, name)
    await writeFile(path, source, { flag: 'wx' })
    try {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await login(page)
      await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
      await page.getByRole('button', { name, exact: true }).click()
      const article = page.getByRole('article', { name: format === 'html' ? 'HTML document' : 'Markdown document', exact: true })
      const heading = article.getByRole('heading', { name: 'Width guide', exact: true })
      await expect(heading).toBeVisible()
      const paragraph = article.getByText('Prose and tables share the same reading width.', { exact: true })
      const table = article.getByRole('table').first()
      const headingBox = (await heading.boundingBox())!
      const paragraphBox = (await paragraph.boundingBox())!
      const tableBox = (await table.boundingBox())!
      expect(paragraphBox.width).toBeGreaterThan(900)
      expect(tableBox.x).toBeCloseTo(headingBox.x, 0)
      expect(tableBox.x).toBeCloseTo(paragraphBox.x, 0)
      expect(tableBox.width).toBeCloseTo(paragraphBox.width, 0)
      await page.screenshot({ path: info.outputPath(`${format}-wide-content.png`) })
      await page.setViewportSize({ width: 390, height: 844 })
      const frame = article.getByRole('table').nth(1).locator('..')
      await frame.scrollIntoViewIfNeeded()
      await expect(frame).toHaveCSS('overflow-x', 'auto')
      expect(await frame.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
      await frame.focus()
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => frame.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
      expect(await article.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: info.outputPath(`${format}-narrow-table.png`) })
      expect(await readFile(path, 'utf8')).toBe(source)
    }
    finally {
      await rm(path, { force: true })
    }
  })
}
