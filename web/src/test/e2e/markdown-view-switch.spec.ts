import { browse, expect, login, test } from './support'

test('Markdown opens directly in the reader with no extra mode row on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await browse(page, 'docs')
  await page.getByRole('button', { name: /^overview\.md/ }).first().click()
  const article = page.getByRole('article', { name: 'Markdown document', exact: true })
  await expect(article).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Markdown view' })).toHaveCount(0)
  const header = (await page.locator('.app-header').boundingBox())!
  const toolbar = (await page.locator('.document-reader-toolbar').boundingBox())!
  expect(toolbar.y).toBeCloseTo(header.y + header.height, 0)
  expect((await article.boundingBox())!.y).toBeCloseTo(toolbar.y + toolbar.height, 0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
