import { expect, login, test } from './support'

test('the explorer can be dragged wider, keeps that width across a reload and steps with the keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await login(page, true)
  const tree = page.locator('.workspace-body > .file-tree')
  const handle = page.getByRole('separator', { name: 'Resize project files' })
  await expect(tree).toBeVisible()
  const before = (await tree.boundingBox())!.width
  expect(before).toBe(232)
  const box = (await handle.boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 120, y, { steps: 8 })
  await page.mouse.up()
  const widened = (await tree.boundingBox())!.width
  expect(widened).toBeGreaterThan(before + 100)

  await page.reload()
  await expect(page.locator('.workspace-body > .file-tree')).toBeVisible()
  expect((await page.locator('.workspace-body > .file-tree').boundingBox())!.width).toBe(widened)

  await handle.focus()
  await page.keyboard.press('ArrowLeft')
  expect((await tree.boundingBox())!.width).toBe(widened - 16)

  // The splitter never lets the explorer swallow the workspace or disappear.
  const moved = (await handle.boundingBox())!
  await page.mouse.move(moved.x + moved.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(moved.x - 600, y, { steps: 10 })
  await page.mouse.up()
  expect((await tree.boundingBox())!.width).toBe(180)
})
