import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('the compact header copies exact absolute file paths on desktop and phone', async ({ page }, info) => {
  const folder = `copy-${randomUUID().slice(0, 8)}`
  const name = '流程 guide.md'
  const path = `${folder}/${name}`
  await mkdir(join(root, folder))
  await writeFile(join(root, path), '# Copy path\n')
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await login(page, true)
    await page.goto(`/?path=${encodeURIComponent(path)}`)
    const header = page.locator('.header-file')
    await expect(header.getByRole('heading', { name, exact: true })).toHaveClass(/sr-only/)
    await expect(header).not.toContainText(folder)
    const copy = header.getByRole('button', { name: 'Copy absolute path', exact: true })
    await expect(copy).toBeEnabled()
    await copy.focus()
    await copy.press('Enter')
    await expect(header.getByRole('status').filter({ hasText: 'Path copied' })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(join(root, path))
    await page.screenshot({ path: info.outputPath('file-header-desktop.png'), animations: 'disabled' })
    await page.goto('/?path=welcome.mmd')
    await expect(header.getByRole('heading', { name: 'welcome.mmd', exact: true })).toHaveClass(/sr-only/)
    await expect(header.getByText('Path copied')).toHaveCount(0)
    await expect(copy).toBeEnabled()
    await copy.click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(join(root, 'welcome.mmd'))
    await live(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(copy).toBeVisible()
    const box = await copy.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
    await copy.click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(join(root, 'welcome.mmd'))
    await copy.evaluate(element => (element as HTMLButtonElement).blur())
    await page.screenshot({ path: info.outputPath('file-header-phone.png'), animations: 'disabled' })
    await page.goto('/')
    await expect(copy).toHaveCount(0)
  }
  finally {
    await page.close()
    await rm(join(root, folder), { recursive: true, force: true })
  }
})
