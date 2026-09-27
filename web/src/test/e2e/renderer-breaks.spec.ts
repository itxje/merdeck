import type { Page } from '@playwright/test'
import { createHash, randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { originalFlowSha256, originalFlowSource } from '../original-flow'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')
const labels = [...originalFlowSource.matchAll(/\b([A-Z])[[{]"([^"]+)"[\]}]/g)].map(match => ({ id: match[1]!, lines: match[2]!.split('<br/>') }))
const branches = [...originalFlowSource.matchAll(/\|"([^"]+)"\|/g)].map(match => match[1]!).sort()
const hash = (source: string) => createHash('sha256').update(source).digest('hex')

async function originalGeometry(page: Page) {
  const svg = page.locator('.diagram-graphic svg')
  await expect(svg.locator('g.node')).toHaveCount(16)
  const geometry = await svg.evaluate((element, labels) => labels.map(({ id }) => {
    const node = [...element.querySelectorAll('g.node')].find(item => item.id.includes(`-flowchart-${id}-`))
    return {
      id,
      rows: [...(node?.querySelectorAll<SVGTSpanElement>('tspan.text-outer-tspan') ?? [])].map(row => ({ text: row.textContent, y: row.getBBox().y, height: row.getBBox().height, screenWidth: row.getBoundingClientRect().width })),
    }
  }), labels)
  expect(labels).toHaveLength(16)
  expect(labels.filter(label => label.lines.length === 2)).toHaveLength(6)
  for (const [index, label] of labels.entries()) {
    const rows = geometry[index]!.rows
    // Mermaid may wrap a long line further; each explicit break must still end a row.
    let cursor = 0
    for (const line of label.lines) {
      const expected = line.replace(/\s/g, '')
      let observed = ''
      while (cursor < rows.length && observed.length < expected.length)
        observed += (rows[cursor++]!.text ?? '').replace(/\s/g, '')
      expect(observed).toBe(expected)
    }
    expect(cursor).toBe(rows.length)
    for (const [line, row] of rows.entries()) {
      expect(row.height).toBeGreaterThan(0)
      expect(row.screenWidth).toBeGreaterThan(0)
      if (line > 0)
        expect(row.y - rows[line - 1]!.y).toBeGreaterThan(row.height / 2)
    }
  }
  expect((await svg.locator('.edgeLabel text').allTextContents()).filter(Boolean).sort()).toEqual(branches)
  expect(await svg.textContent()).not.toMatch(/<\/?br\b|&(?:lt|gt);/i)
  await expect(svg.locator('foreignObject, script, image, a, use, style, animate, animateMotion, animateTransform, set, filter, [href], [src], [style]')).toHaveCount(0)
  expect(await svg.evaluate(element => [element, ...element.querySelectorAll('*')].some(node => [...node.attributes].some(attribute => /^on/i.test(attribute.name))))).toBe(false)
  return geometry.map(node => ({ id: node.id, rows: node.rows.length, separation: node.rows.length === 2 ? node.rows[1]!.y - node.rows[0]!.y : null }))
}

test('original Unicode labels retain real line breaks, draft and saved bytes on desktop and narrow screens', async ({ page }, info) => {
  test.setTimeout(90000)
  expect(hash(originalFlowSource)).toBe(originalFlowSha256)
  const name = `renderer-original-${randomUUID()}.mmd`
  const path = join(root, name)
  const initial = 'flowchart LR\n  Empty --> Fixture\n'
  await writeFile(path, initial, { flag: 'wx' })
  const writes: string[] = []
  const unexpectedPaths: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (!['/', '/index.html', '/api/build', '/api/session', '/api/diagrams/directory', '/api/diagrams/directory/revision', '/api/diagrams/directory/close', '/api/diagrams/document', '/api/diagrams/revision', '/api/diagrams/source'].includes(pathname) && !pathname.startsWith('/assets/'))
      unexpectedPaths.push(pathname)
    if (request.method() === 'PUT')
      writes.push(request.postData() ?? '')
  })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await choose(page, name)
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await editor.fill(originalFlowSource)
    try {
      await live(page)
    }
    catch (error) {
      await page.screenshot({ path: info.outputPath('original-failure.png'), fullPage: true, animations: 'disabled' })
      throw error
    }
    const geometry = await originalGeometry(page)
    await expect(editor).toHaveValue(originalFlowSource)
    expect(await readFile(path, 'utf8')).toBe(initial)
    expect(writes).toHaveLength(0)
    await page.screenshot({ path: '../tmp/render-original-desktop.png', fullPage: true, animations: 'disabled' })
    await page.locator('.diagram-graphic svg').screenshot({ path: '../tmp/render-original-svg.png', animations: 'disabled', scale: 'css' })
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.screenshot({ path: '../tmp/render-original-detail.png', fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Fit', exact: true }).click()

    await choose(page, 'sequence.mermaid')
    await choose(page, name)
    await expect(editor).toHaveValue(originalFlowSource)
    await live(page)
    expect(writes).toHaveLength(0)
    const saved = page.waitForResponse(response => response.request().method() === 'PUT')
    await editor.press('Control+s')
    const response = await saved
    expect(response.status()).toBe(200)
    const submitted: unknown = JSON.parse(writes[0]!)
    expect(submitted).toMatchObject({ path: name, source: originalFlowSource })
    expect(writes).toHaveLength(1)
    expect(unexpectedPaths).toEqual([])
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    expect(hash(await readFile(path, 'utf8'))).toBe(originalFlowSha256)
    await expect(editor).toHaveValue(originalFlowSource)
    await page.reload()
    await expect(editor).toHaveValue(originalFlowSource)
    await live(page)
    await originalGeometry(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Fit', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Scrollable diagram canvas' })).toBeVisible()
    await originalGeometry(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const zoom = await page.getByLabel('Zoom level').textContent()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await expect(page.getByLabel('Zoom level')).not.toHaveText(zoom!)
    await page.getByRole('button', { name: 'Fit', exact: true }).click()
    await page.screenshot({ path: '../tmp/render-original-narrow-preview.png', fullPage: true, animations: 'disabled' })
    await page.getByRole('tab', { name: 'Source', exact: true }).click()
    await expect(editor).toHaveValue(originalFlowSource)
    await page.screenshot({ path: '../tmp/render-original-narrow-source.png', fullPage: true, animations: 'disabled' })
    expect(hash(await readFile(path, 'utf8'))).toBe(originalFlowSha256)
    expect(writes).toHaveLength(1)
    expect(unexpectedPaths).toEqual([])
    process.stdout.write(`${JSON.stringify({ originalInput: originalFlowSha256, nodes: geometry.length, branches: branches.length, geometry, implicitPuts: 0, explicitPuts: 1, sourceDraftRequestSavedBytesEqual: true })}\n`)
  }
  finally { await rm(path) }
})

test('bare break variants render as SVG rows while neighboring hostile forms retain the last valid preview', async ({ page }) => {
  test.setTimeout(60000)
  await login(page, true)
  await choose(page, 'welcome.mmd')
  const editor = page.getByLabel('Mermaid source', { exact: true })
  let writes = 0
  const resources: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'PUT')
      writes++
    if (request.resourceType() === 'image' || request.resourceType() === 'font' || !['/api/diagrams/revision', '/api/diagrams/directory', '/api/diagrams/directory/revision', '/api/diagrams/directory/close'].includes(new URL(request.url()).pathname))
      resources.push(request.resourceType())
  })
  // Warm the ordinary flowchart chunks before auditing label-driven requests.
  await editor.fill('flowchart LR\nA[Warm] --> B[Preview]')
  await live(page)
  resources.length = 0
  for (const tag of ['<br>', '<br/>', '<br />', '<BR>', '<BR/>', '<BR />', '<bR/>']) {
    const source = `flowchart LR\nA["First${tag}Second"] -->|"Accept${tag}Continue"| B[Final]`
    await editor.fill(source)
    await live(page)
    expect(await page.locator('.diagram-graphic g.node').first().locator('tspan.text-outer-tspan').allTextContents()).toEqual(['First', 'Second'])
    expect(await page.locator('.diagram-graphic .edgeLabel tspan.text-outer-tspan').allTextContents()).toEqual(['Accept', 'Continue'])
    await expect(editor).toHaveValue(source)
  }
  const validSvg = await page.locator('.diagram-graphic').innerHTML()
  for (const label of ['<br onclick="window.pwned=1">', '<br/onload=window.pwned=1>', '<br src="/diagram-resource-probe">', '<br//>', '<br / >', '&lt;br/&gt;', '#60;br/#62;', '<br/><script>window.pwned=1</script>']) {
    const source = `flowchart LR\nA["First${label}Second"]`
    await editor.fill(source)
    await expect(page.getByText('Rendering…', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
    await expect(page.getByText('Last valid preview', { exact: true })).toBeVisible()
    await expect(page.getByText(/Preview uses plain Mermaid only\./)).toBeVisible()
    expect(await page.locator('.diagram-graphic').innerHTML()).toBe(validSvg)
    await expect(editor).toHaveValue(source)
    expect(await page.evaluate(() => Reflect.has(window, 'pwned'))).toBe(false)
  }
  await editor.fill('flowchart LR\nA[Recovered<br/>Preview]')
  await live(page)
  expect(await page.locator('.diagram-graphic tspan.text-outer-tspan').allTextContents()).toEqual(['Recovered', 'Preview'])
  expect(writes).toBe(0)
  expect(resources).toEqual([])
  await expect(page.locator('.diagram-graphic foreignObject, .diagram-graphic script, .diagram-graphic image, .diagram-graphic a, [onload], [onerror]')).toHaveCount(0)
})
