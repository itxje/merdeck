import { originalSolarSource } from '../original-solar'
import { choose, expect, live, login, test } from './support'

for (const colorScheme of ['light', 'dark'] as const) {
  test(`styled flowchart node labels stay readable in the ${colorScheme} scheme`, async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ colorScheme })
    await login(page, true)
    await choose(page, 'welcome.mmd')
    await page.getByLabel('Mermaid source', { exact: true }).fill(originalSolarSource)
    await live(page)
    await expect(page.locator('.diagram-graphic g.node')).toHaveCount(24)
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(colorScheme === 'dark')
    const labels = await page.locator('.diagram-graphic').evaluate((graphic) => {
      const rgb = (value: string) => value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0]
      const channel = (value: number) => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
      const luminance = ([red, green, blue]: number[]) => 0.2126 * channel(red!) + 0.7152 * channel(green!) + 0.0722 * channel(blue!)
      return [...graphic.querySelectorAll('g.node')].map((node) => {
        const shape = [...node.querySelectorAll('rect, polygon, path, circle, ellipse')].find(element => !element.closest('.label') && getComputedStyle(element).fill.startsWith('rgb'))!
        const text = node.querySelector('.label text')!
        const [light, dark] = [luminance(rgb(getComputedStyle(shape).fill)), luminance(rgb(getComputedStyle(text).fill))].sort((first, second) => second - first)
        return { id: node.id, ratio: (light! + 0.05) / (dark! + 0.05) }
      })
    })
    for (const { id, ratio } of labels)
      expect(ratio, id).toBeGreaterThanOrEqual(4.5)
  })
}
