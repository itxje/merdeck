import type { Locator } from '@playwright/test'
import { expect, live, login, test } from './support'

const width = async (locator: Locator) => (await locator.boundingBox())!.width

test('source and preview panes resize, collapse and keep their layout', async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  await page.getByRole('button', { name: 'welcome.mmd', exact: true }).click()
  await live(page)
  const source = page.getByRole('region', { name: 'Source editor', exact: true })
  const preview = page.getByRole('region', { name: 'Diagram preview', exact: true })
  const handle = page.getByRole('separator', { name: 'Resize source and preview', exact: true })

  await expect(source).toBeHidden()
  const showSource = page.getByRole('button', { name: 'Show source', exact: true })
  await expect(showSource).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('source-default.png') })
  await showSource.focus()
  await page.keyboard.press('Enter')
  await expect(source).toBeVisible()

  const initial = await width(source)
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  const dragged = await width(source)
  expect(dragged).toBeGreaterThan(initial + 150)

  await handle.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => width(source)).toBeLessThan(dragged)

  const expanded = await width(source)
  await page.reload()
  await live(page)
  await expect(source).toBeVisible()
  await expect.poll(async () => Math.abs(await width(source) - expanded)).toBeLessThan(2)

  const beforeCollapse = await width(preview)
  await page.getByRole('button', { name: 'Hide source', exact: true }).click()
  await expect(source).toBeHidden()
  await expect(page.getByRole('button', { name: 'Show source', exact: true })).toBeVisible()
  await expect.poll(() => width(preview)).toBeGreaterThan(beforeCollapse + 300)

  await page.reload()
  await live(page)
  await expect(source).toBeHidden()
  await page.getByRole('button', { name: 'Show source', exact: true }).click()
  await expect(source).toBeVisible()
  const editor = page.getByLabel('Mermaid source', { exact: true })
  await expect(editor).toBeVisible()
  const draft = `${await editor.inputValue()}\n%% Unsaved pane draft`
  await editor.fill(draft)

  await page.getByRole('button', { name: 'Hide source', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(handle).toBeHidden()
  await page.getByRole('tab', { name: 'Source', exact: true }).click()
  await expect(editor).toBeVisible()
  await expect(editor).toHaveValue(draft)
  await page.getByRole('tab', { name: 'Preview', exact: true }).click()
  await live(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
