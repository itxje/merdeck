import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resourceTextFlowchart } from '../resource-text-flowchart'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('resource-like label text renders without resource requests and keeps exact source bytes', async ({ page }, info) => {
  const name = `resource-text-${randomUUID()}.mmd`
  const path = join(root, name)
  await writeFile(path, resourceTextFlowchart, { flag: 'wx' })
  const writes: string[] = []
  const resources: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'PUT')
      writes.push(request.postData() ?? '')
    if (new URL(request.url()).origin !== new URL(process.env.MERDECK_TEST_URL!).origin)
      resources.push(request.url())
  })
  try {
    await page.setViewportSize({ width: 1600, height: 1000 })
    await login(page, true)
    await choose(page, name)
    try {
      await live(page)
    }
    catch (error) {
      await page.screenshot({ path: info.outputPath('resource-text-failure.png'), animations: 'disabled' })
      throw error
    }
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const graphic = page.locator('.diagram-graphic')
    const node = (id: string) => graphic.locator(`g.node[id*="-flowchart-${id}-"]`)
    await expect(node('ENCODE')).toContainText('base64url(CBOR(ConnInfo))')
    await expect(node('MAP')).toContainText('https://example.invalid/map.json')
    await expect(graphic.locator('g.cluster')).toHaveCount(2)
    await expect(graphic.locator('a, [href], [src], [data-file-link], foreignObject, image, script, style')).toHaveCount(0)
    const boxes = await graphic.locator('g.node').evaluateAll(nodes => nodes.map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect()
      return { x, y, width, height }
    }))
    expect(boxes).toHaveLength(3)
    for (const [index, box] of boxes.entries()) {
      expect(box.width).toBeGreaterThan(0)
      expect(box.height).toBeGreaterThan(0)
      for (const other of boxes.slice(index + 1))
        expect(box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + other.height && other.y < box.y + box.height).toBe(false)
    }
    await info.attach('geometry', { body: JSON.stringify(boxes), contentType: 'application/json' })
    await page.screenshot({ path: info.outputPath('resource-text.png'), animations: 'disabled' })
    await expect(editor).toHaveValue(resourceTextFlowchart)

    // On-diagram label editing currently applies to sources without front matter.
    const plain = resourceTextFlowchart.slice(resourceTextFlowchart.indexOf('flowchart LR'))
    await editor.fill(plain)
    await live(page)
    await expect(page.getByRole('region', { name: 'Scrollable diagram canvas' })).toHaveAttribute('data-editable', 'ready')
    await node('MAP').dblclick()
    const label = page.getByRole('textbox', { name: 'Node label', exact: true })
    await expect(label).toHaveValue('Map\nhttps://example.invalid/map.json')
    await label.fill('Map\nhttps://example.invalid/updated.json')
    await label.press('Enter')
    const edited = plain.replace('/map.json', '/updated.json')
    await expect(editor).toHaveValue(edited)
    await live(page)
    await expect(node('MAP')).toContainText('https://example.invalid/updated.json')
    expect(writes).toEqual([])
    expect(await readFile(path, 'utf8')).toBe(resourceTextFlowchart)
    const titled = resourceTextFlowchart.replace('/map.json', '/updated.json')
    await editor.fill(titled)
    await live(page)
    const saved = page.waitForResponse(response => response.request().method() === 'PUT')
    await page.getByRole('button', { name: /^Save/ }).click()
    expect((await saved).status()).toBe(200)
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    expect(await readFile(path, 'utf8')).toBe(titled)

    for (const unsafe of ['click MAP "https://example.invalid/a.mmd"', 'style MAP fill:url(https://example.invalid/a)', 'BAD["https://example.invalid<br onload=alert(1)>"]']) {
      await editor.fill(`${titled}${unsafe}\n`)
      await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
      await expect(graphic.locator('[data-file-link]')).toHaveCount(0)
      await editor.fill(titled)
      await live(page)
    }
    expect(writes).toHaveLength(1)
    expect(resources).toEqual([])
  }
  finally { await rm(path, { force: true }) }
})
