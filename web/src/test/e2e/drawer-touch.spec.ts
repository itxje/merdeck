import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { browse, expect, login, test } from './support'

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

test('touch-opening Files can scroll populated rows before using drawer controls', async ({ page, browserName }) => {
  const root = process.env.MERDECK_SMOKE_ROOT
  if (!root)
    throw new Error('An explicit disposable sample root is required')
  const owned = await mkdtemp(join(root, 'drawer-touch-'))
  try {
    await Promise.all(Array.from({ length: 24 }, (_, index) => writeFile(join(owned, `file-${String(index).padStart(2, '0')}.mmd`), 'flowchart LR\nA --> B\n')))
    await login(page, true)
    await browse(page, basename(owned))
    const dialog = page.getByRole('dialog', { name: 'Project files', exact: true })
    await dialog.getByRole('button', { name: 'file-00.mmd', exact: true }).tap()
    await expect(dialog).toHaveCount(0)

    const opener = page.getByRole('button', { name: 'Open project files', exact: true })
    await opener.tap()
    const listing = dialog.getByRole('navigation', { name: 'Files and diagrams', exact: true })
    await expect(listing.getByRole('button', { name: 'file-23.mmd', exact: true })).toBeAttached()
    await expect(dialog.getByRole('textbox', { name: 'Filter files', exact: true })).not.toBeFocused()

    if (browserName === 'chromium') {
      const box = await listing.boundingBox()
      if (!box)
        throw new Error('Missing file listing')
      const touch = await page.context().newCDPSession(page)
      const x = box.x + box.width / 2
      const y = box.y + Math.min(box.height - 40, 190)
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let offset = 20; offset <= 140; offset += 20) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - offset }] })
        await page.waitForTimeout(15)
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await expect.poll(() => listing.evaluate(node => node.scrollTop)).toBeGreaterThan(80)
    }
    else {
      // Playwright's WebKit driver cannot dispatch a native swipe; verify the overflow geometry.
      await expect.poll(() => listing.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  }
  finally {
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})
