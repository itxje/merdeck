import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

for (const format of ['html', 'markdown'] as const) {
  test(`${format} reader separates contents scrolling and offers an accessible narrow drawer`, async ({ page }) => {
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
