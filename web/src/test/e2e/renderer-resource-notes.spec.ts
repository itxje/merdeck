import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resourceTextClass, resourceTextSequence } from '../resource-text-notes'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

for (const [kind, source, expected] of [
  ['sequence', resourceTextSequence, ['Proxy command: curl http://server.invalid:8081/']],
  ['class', resourceTextClass, ['base64url(CBOR(value))', 'Encoded address', 'Stored locally']],
] as const) {
  test(`${kind} notes preserve inert text and exact saved source`, async ({ page }, info) => {
    const name = `resource-notes-${randomUUID()}.mmd`
    const path = join(root, name)
    await writeFile(path, source, { flag: 'wx' })
    try {
      await page.setViewportSize({ width: 1500, height: 1000 })
      await login(page, true)
      await choose(page, name)
      try {
        await live(page)
      }
      catch (error) {
        await page.screenshot({ path: info.outputPath('notes-failure.png'), animations: 'disabled' })
        throw error
      }
      const graphic = page.locator('.diagram-graphic svg')
      for (const text of expected)
        await expect(graphic).toContainText(text)
      await expect(graphic.locator('a, [href], [src], [data-file-link], foreignObject, image, script, style')).toHaveCount(0)
      const geometry = await graphic.evaluate(svg => [...svg.querySelectorAll('text > tspan, text:not(:has(tspan))')].map((node) => {
        const { x, y, width, height } = node.getBoundingClientRect()
        return { text: node.textContent, x, y, width, height }
      }))
      expect(geometry.filter(row => row.width > 0 && row.height > 0).length).toBeGreaterThan(1)
      await info.attach('text-geometry', { body: JSON.stringify(geometry), contentType: 'application/json' })
      if (kind === 'class') {
        const rows = expected.map(text => geometry.find(row => row.text?.includes(text)))
        expect(rows.every(row => row && row.width > 0 && row.height > 0)).toBe(true)
        expect(new Set(rows.map(row => row?.y)).size).toBe(3)
      }
      await page.screenshot({ path: info.outputPath('notes.png'), animations: 'disabled' })
      const editor = page.getByLabel('Mermaid source', { exact: true })
      await expect(editor).toHaveValue(source)
      expect(await readFile(path, 'utf8')).toBe(source)
      const changed = `${source}%% Preserved note source\n`
      await editor.fill(changed)
      await live(page)
      const response = page.waitForResponse(response => response.request().method() === 'PUT')
      await page.getByRole('button', { name: /^Save/ }).click()
      expect((await response).status()).toBe(200)
      await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
      expect(await readFile(path, 'utf8')).toBe(changed)
    }
    finally {
      await page.close()
      await rm(path, { force: true })
    }
  })
}
