import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('phone file sync icons distinguish pending, saving, acknowledged and refused writes without tooltips', async ({ page, audit }, info) => {
  const name = `sync-${randomUUID()}.mmd`
  const path = join(root, name)
  const initial = 'flowchart LR\n  Original --> File\n'
  const submitted = 'flowchart LR\n  Submitted --> File\n'
  const external = 'flowchart LR\n  External --> File\n'
  let deliverSave!: () => void
  const saveGate = new Promise<void>((resolve) => {
    deliverSave = resolve
  })
  let sendConflict!: () => void
  const conflictGate = new Promise<void>((resolve) => {
    sendConflict = resolve
  })
  await writeFile(path, initial, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page, true)
    await page.goto(`/?path=${encodeURIComponent(name)}`)
    const source = page.getByLabel('Mermaid source', { exact: true })
    await expect(source).toBeAttached()
    await live(page)
    await page.getByRole('tab', { name: 'Source', exact: true }).click()
    const showSource = page.getByRole('button', { name: 'Show source', exact: true })
    if (await showSource.isVisible())
      await showSource.click()
    await expect(source).toBeVisible()
    await expect(source).toHaveValue(initial)
    const status = page.locator('.file-sync-status')
    const arrows = status.locator('.sync-arrows')
    const marker = status.locator('.sync-marker')
    await expect(status).toHaveAttribute('data-sync-state', 'synced')
    await expect(arrows).toBeVisible()
    await expect(marker).toHaveClass(/lucide-circle-check/)
    expect((await arrows.boundingBox())?.width).toBe(20)
    const syncedColor = await status.evaluate(element => getComputedStyle(element).color)
    await status.hover()
    await status.click()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(status).not.toHaveAttribute('title')
    await expect(status.locator('.sr-only')).toHaveText('Synced')
    await expect(status.locator('.sr-only')).toHaveCSS('clip-path', 'inset(50%)')
    await page.screenshot({ path: info.outputPath('sync-synced-phone.png'), animations: 'disabled' })

    await source.fill(submitted)
    await expect(status).toHaveAttribute('data-sync-state', 'pending')
    await expect(marker).toHaveClass(/(?:^|\s)lucide-circle(?:\s|$)/)
    await expect(marker).toHaveAttribute('fill', 'currentColor')
    const pendingColor = await status.evaluate(element => getComputedStyle(element).color)
    expect(pendingColor).not.toBe(syncedColor)
    await page.screenshot({ path: info.outputPath('sync-pending-phone.png'), animations: 'disabled' })

    await page.route('**/api/diagrams/source', async (route) => {
      const response = await route.fetch()
      expect(response.status()).toBe(200)
      await saveGate
      await route.fulfill({ response })
    }, { times: 1 })
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(status).toHaveAttribute('data-sync-state', 'saving')
    await expect(marker).toHaveCount(0)
    await expect(arrows).toHaveCSS('animation-name', 'sync-status-spin')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(arrows).toHaveCSS('animation-name', 'none')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(arrows).toHaveCSS('animation-name', 'sync-status-spin')
    await page.screenshot({ path: info.outputPath('sync-saving-phone.png'), animations: 'disabled' })
    deliverSave()
    await expect(status).toHaveAttribute('data-sync-state', 'synced')
    expect(await readFile(path, 'utf8')).toBe(submitted)

    audit.allowHttp(409, '/api/diagrams/source')
    let intercept!: () => void
    const intercepted = new Promise<void>((resolve) => {
      intercept = resolve
    })
    await page.route('**/api/diagrams/source', async (route) => {
      intercept()
      await conflictGate
      await route.continue()
    }, { times: 1 })
    await source.fill('flowchart LR\n  Unsaved --> Draft\n')
    const refused = page.waitForResponse(response => response.request().method() === 'PUT')
    await page.getByRole('button', { name: /^Save/ }).click()
    await intercepted
    await writeFile(path, external)
    sendConflict()
    expect((await refused).status()).toBe(409)
    await expect(status).toHaveAttribute('data-sync-state', 'failed')
    await expect(marker).toHaveClass(/lucide-circle-alert/)
    const failedColor = await status.evaluate(element => getComputedStyle(element).color)
    expect(failedColor).not.toBe(syncedColor)
    expect(failedColor).not.toBe(pendingColor)
    await status.click()
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    await expect(status).not.toHaveAttribute('title')
    expect(await readFile(path, 'utf8')).toBe(external)
    await page.screenshot({ path: info.outputPath('sync-failed-phone.png'), animations: 'disabled' })
    await page.locator('html').evaluate(element => element.classList.add('dark'))
    await expect(marker).toBeVisible()
    await page.screenshot({ path: info.outputPath('sync-failed-phone-dark.png'), animations: 'disabled' })
  }
  finally {
    deliverSave()
    sendConflict()
    await page.unrouteAll({ behavior: 'wait' })
    await page.close()
    await rm(path, { force: true })
  }
})
