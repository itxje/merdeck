import type { Locator } from '@playwright/test'
import { choose, chooseBlock, expect, login, test } from './support'

// WCAG contrast ratio between a row's own background and the explorer background.
function fillContrast(row: Locator) {
  return row.evaluate((element) => {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const explorer = element.closest('.file-tree')
    if (!context || !explorer)
      throw new Error('Expected a canvas context and an explorer')
    const luminance = (color: string) => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = '#010203'
      context.fillStyle = color
      if (context.fillStyle === '#010203')
        throw new Error(`Unparsed colour ${color}`)
      context.fillRect(0, 0, 1, 1)
      const [red, green, blue] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => {
        const channel = value / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
    }
    const [lighter, darker] = [luminance(getComputedStyle(element).backgroundColor), luminance(getComputedStyle(explorer).backgroundColor)].sort((a, b) => b - a)
    return (lighter! + 0.05) / (darker! + 0.05)
  })
}

test('the explorer selects Markdown diagrams and fills only the selected row', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page)
  await choose(page, 'overview.md')
  await expect(page.getByRole('tablist', { name: 'Markdown blocks' })).toHaveCount(0)
  const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
  const diagrams = explorer.getByRole('list', { name: 'Diagrams in overview.md', exact: true })
  const file = explorer.getByRole('button', { name: /^overview\.md/ })
  const folder = explorer.getByRole('button', { name: 'docs', exact: true })
  const editor = page.getByLabel('Mermaid source', { exact: true })
  await expect(diagrams.getByRole('button').first()).toHaveAttribute('aria-current', 'true')
  const first = await editor.inputValue()
  await chooseBlock(page, 'overview.md', 2)
  const second = await editor.inputValue()
  expect(second).not.toBe(first)
  await page.mouse.move(900, 600)
  await expect(explorer.locator('[aria-current="true"]')).toHaveCount(1)
  await expect(file).not.toHaveAttribute('aria-current', 'true')
  await expect(file).toHaveAttribute('data-open', 'true')
  await expect(folder).toHaveAttribute('aria-expanded', 'true')
  await expect(folder).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(file).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const selected = diagrams.getByRole('button').nth(1)
  // Rows transition their colours, so wait for the settled fill in each scheme.
  await expect.poll(() => fillContrast(selected)).toBeGreaterThanOrEqual(1.25)
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.mouse.move(900, 600)
  await expect.poll(() => fillContrast(selected)).toBeGreaterThanOrEqual(1.25)

  await editor.fill(`${second}\n  Marked --> Draft\n`)
  await expect(diagrams.getByRole('button', { name: /^02 .* Unsaved changes$/ })).toBeVisible()
  await expect(diagrams.getByRole('button', { name: /Unsaved changes$/ })).toHaveCount(1)
  await editor.fill(second)
  await expect(diagrams.getByRole('button', { name: /Unsaved changes$/ })).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open project files', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Project files', exact: true })
  await drawer.getByRole('list', { name: 'Diagrams in overview.md', exact: true }).getByRole('button').first().click()
  await expect(drawer).toHaveCount(0)
  await page.getByRole('tab', { name: 'Source', exact: true }).click()
  await expect(editor).toHaveValue(first)
})
