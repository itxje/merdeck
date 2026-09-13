import type { Page } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { originalSolarSha256, originalSolarSource } from '../original-solar'
import { choose, chooseBlock, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')
const hash = (source: string) => createHash('sha256').update(source).digest('hex')
const labels = [...originalSolarSource.matchAll(/^\s+([A-Z]\w*)[[(]+"([^"]+)"[\])]+$/gm)].map(match => ({ id: match[1]!, lines: match[2]!.split('<br/>') }))
const groups = [...originalSolarSource.matchAll(/subgraph (\w+)\["([^"]+)"\]/g)].map(match => match[2]!)
const classes = [...originalSolarSource.matchAll(/^\s+class ([\w,]+) (\w+)$/gm)].flatMap(match => match[1]!.split(',').map(id => ({ id, name: match[2]! })))
const palette: Record<string, [string, string, string, string]> = {
  solar: ['rgb(255, 248, 225)', 'rgb(245, 127, 23)', '2px', 'none'],
  ac: ['rgb(227, 242, 253)', 'rgb(21, 101, 192)', '2px', 'none'],
  core: ['rgb(232, 245, 233)', 'rgb(56, 142, 60)', '2px', 'none'],
  dc: ['rgb(255, 235, 238)', 'rgb(198, 40, 40)', '2px', 'none'],
  ground: ['rgb(239, 235, 233)', 'rgb(93, 64, 55)', '2px', 'none'],
  xref: ['rgb(245, 245, 245)', 'rgb(153, 153, 153)', '1px', '5px, 5px'],
}
const pairs = ['PV:PV_BRK', 'PV_BRK:PV_SW', 'PV_SW:MPPT', 'MPPT:BATTERM', 'SHORE:ACSEL', 'GEN:ACSEL', 'ACSEL:GI', 'ACSEL:ISOXF', 'GI:AC_BRK', 'ISOXF:AC_BRK', 'AC_BRK:INV', 'INV:AC_OUT1', 'INV:AC_OUT2', 'BAT:POS', 'BAT:NEG', 'POS:FUSE', 'FUSE:SW', 'SW:BATTERM', 'NEG:BATTERM', 'BAT:SENSE', 'BAT:SENSE', 'NEG:GND', 'BATTERM:GND', 'GND:HULL', 'POS:DC_FP']
const compact = (value: string) => value.replace(/\s/g, '')

async function geometry(page: Page) {
  const svg = page.locator('.diagram-graphic svg')
  await expect(svg.locator('g.node')).toHaveCount(24)
  await expect(svg.locator('g.cluster')).toHaveCount(4)
  expect(labels).toHaveLength(24)
  expect(classes).toHaveLength(24)
  const observed = await svg.evaluate((element, labels) => ({
    nodes: labels.map(({ id }) => {
      const node = [...element.querySelectorAll('g.node')].find(item => item.id.includes(`-flowchart-${id}-`))!
      const shape = node.querySelector('rect,polygon,path,circle,ellipse')!
      const computed = getComputedStyle(shape)
      return { id, style: [computed.fill, computed.stroke, computed.strokeWidth, computed.strokeDasharray], rows: [...node.querySelectorAll<SVGTSpanElement>('tspan.text-outer-tspan')].map(row => ({ text: row.textContent ?? '', y: row.getBBox().y, height: row.getBBox().height, width: row.getBoundingClientRect().width })) }
    }),
    edges: [...element.querySelectorAll<SVGPathElement>('path.flowchart-link')].map(path => ({ id: path.id, classes: path.getAttribute('class'), length: path.getTotalLength(), width: getComputedStyle(path).strokeWidth, box: path.getBBox().width + path.getBBox().height })),
    groups: [...element.querySelectorAll('.cluster-label text')].map(label => label.textContent ?? ''),
    edgeLabels: [...element.querySelectorAll('.edgeLabel text')].map(label => label.textContent ?? '').filter(Boolean),
  }), labels)
  for (const [index, label] of labels.entries()) {
    const node = observed.nodes[index]!
    let cursor = 0
    for (const line of label.lines) {
      let text = ''
      while (cursor < node.rows.length && compact(text).length < compact(line).length)
        text += node.rows[cursor++]!.text
      expect(compact(text), label.id).toBe(compact(line))
    }
    expect(cursor).toBe(node.rows.length)
    for (const [index, row] of node.rows.entries()) {
      expect(row.height).toBeGreaterThan(0)
      expect(row.width).toBeGreaterThan(0)
      if (index)
        expect(row.y - node.rows[index - 1]!.y).toBeGreaterThan(row.height / 2)
    }
    expect(node.style, label.id).toEqual(palette[classes.find(item => item.id === label.id)!.name])
  }
  expect(observed.groups.map(compact).sort()).toEqual(groups.map(compact).sort())
  const edgeBoxes = await svg.locator('.edgeLabel text').evaluateAll(elements => elements.filter(element => element.textContent).map(element => (element as SVGGraphicsElement).getBBox().height))
  for (const height of edgeBoxes)
    expect(height).toBeGreaterThan(0)
  const fits = await svg.evaluate((element) => {
    const svg = element as SVGSVGElement
    const view = svg.viewBox.baseVal
    const box = svg.getBBox()
    return box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height
  })
  expect(fits).toBe(true)
  expect(observed.edges).toHaveLength(25)
  const remaining = [...observed.edges]
  for (const pair of pairs) {
    const [from, to] = pair.split(':')
    const index = remaining.findIndex(edge => edge.id.includes(`L_${from}_${to}_`))
    expect(index, pair).toBeGreaterThanOrEqual(0)
    const edge = remaining.splice(index, 1)[0]!
    expect(edge.length).toBeGreaterThan(10)
    expect(edge.box).toBeGreaterThan(10)
    if (['BAT:POS', 'BAT:NEG', 'MPPT:BATTERM', 'SW:BATTERM'].includes(pair))
      expect(Number.parseFloat(edge.width)).toBeGreaterThanOrEqual(3)
  }
  const expectedEdgeLabels = [...originalSolarSource.matchAll(/\|([^|\n]+)\||-- "([^"]+)" -->/g)].map(match => match[1] ?? match[2]!)
  for (const label of expectedEdgeLabels)
    expect(observed.edgeLabels.some(text => compact(text).includes(compact(label))), label).toBe(true)
  expect(await svg.textContent()).not.toMatch(/<\/?br\b|&(?:lt|gt);/i)
  await expect(svg.locator('foreignObject,script,image,a,use,style,animate,animateMotion,animateTransform,set,filter,[href],[src],[style]')).toHaveCount(0)
  expect(await svg.evaluate(element => [element, ...element.querySelectorAll('*')].some(node => [...node.attributes].some(attribute => /^on/i.test(attribute.name))))).toBe(false)
  return observed
}

function auditRequests(page: Page) {
  const writes: string[] = []
  const unexpected: string[] = []
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (!['/', '/index.html', '/api/build', '/api/session', '/api/diagrams/directory', '/api/diagrams/directory/revision', '/api/diagrams/directory/close', '/api/diagrams/document', '/api/diagrams/revision', '/api/diagrams/source'].includes(pathname) && !pathname.startsWith('/assets/'))
      unexpected.push(pathname)
    if (request.method() === 'PUT')
      writes.push(request.postData() ?? '')
  })
  return { writes, unexpected }
}
async function save(page: Page) {
  const response = page.waitForResponse(item => item.request().method() === 'PUT')
  await page.getByRole('button', { name: /^Save/ }).click()
  expect((await response).status()).toBe(200)
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
}

test('original 24-node flowchart retains labels, groups, class presentation and standalone bytes', async ({ page }, info) => {
  test.setTimeout(90000)
  expect(Buffer.byteLength(originalSolarSource)).toBe(2614)
  expect(hash(originalSolarSource)).toBe(originalSolarSha256)
  const name = `renderer-solar-${randomUUID()}.mmd`
  const path = join(root, name)
  const initial = 'flowchart LR\nEmpty --> Fixture\n'
  await writeFile(path, initial, { flag: 'wx' })
  const { writes, unexpected } = auditRequests(page)
  const evidence = '../tmp/render-002'
  await mkdir(evidence, { recursive: true })
  try {
    await page.setViewportSize({ width: 1600, height: 1100 })
    await login(page, true)
    await choose(page, name)
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await editor.fill(originalSolarSource)
    try {
      await live(page)
    }
    catch (error) {
      await page.screenshot({ path: info.outputPath('original-failure.png'), fullPage: true, animations: 'disabled' })
      throw error
    }
    const result = await geometry(page)
    await expect(editor).toHaveValue(originalSolarSource)
    expect(writes).toHaveLength(0)
    expect(await readFile(path, 'utf8')).toBe(initial)
    await page.screenshot({ path: `${evidence}/solar-desktop.png`, fullPage: true, animations: 'disabled' })
    await page.locator('.diagram-graphic svg').screenshot({ path: `${evidence}/solar-svg.png`, animations: 'disabled', scale: 'css' })
    for (let index = 0; index < 6; index++)
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.locator('.diagram-graphic g.node[id*="-flowchart-PV-"]').screenshot({ path: `${evidence}/solar-comparison-detail.png`, animations: 'disabled' })
    await page.locator('.diagram-graphic g.node[id*="-flowchart-DC_FP-"]').screenshot({ path: `${evidence}/solar-dash-detail.png`, animations: 'disabled' })
    await page.getByRole('button', { name: 'Fit', exact: true }).click()
    await choose(page, 'sequence.mermaid')
    await choose(page, name)
    await expect(editor).toHaveValue(originalSolarSource)
    await live(page)
    expect(writes).toHaveLength(0)
    await save(page)
    expect(JSON.parse(writes[0]!)).toMatchObject({ path: name, source: originalSolarSource })
    expect(await readFile(path, 'utf8')).toBe(originalSolarSource)
    await page.reload()
    await expect(editor).toHaveValue(originalSolarSource)
    await live(page)
    await geometry(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Fit', exact: true }).click()
    await geometry(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${evidence}/solar-narrow.png`, fullPage: true, animations: 'disabled' })
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.screenshot({ path: `${evidence}/solar-narrow-detail.png`, fullPage: true, animations: 'disabled' })
    await page.getByRole('tab', { name: 'Source', exact: true }).click()
    await expect(editor).toHaveValue(originalSolarSource)
    expect(hash(await readFile(path, 'utf8'))).toBe(originalSolarSha256)
    expect(writes).toHaveLength(1)
    expect(unexpected).toEqual([])
    await writeFile(`${evidence}/solar-geometry.json`, JSON.stringify(result, null, 2))
    process.stdout.write(`${JSON.stringify({ input: originalSolarSha256, bytes: 2614, nodes: 24, groups: 4, edges: 25, styledNodes: 24, implicitWrites: 0, explicitWrites: 1, sourceDraftRequestDiskReloadEqual: true })}\n`)
  }
  finally { await rm(path) }
})

test('individual Markdown saves preserve original source and unrelated BOM, CRLF, prose and other blocks', async ({ page }) => {
  test.setTimeout(90000)
  const name = `renderer-blocks-${randomUUID()}.md`
  const path = join(root, name)
  const first = 'flowchart LR\nFirst --> Fixture\n'
  const second = 'flowchart LR\nSecond --> Fixture\n'
  const prefix = '\uFEFF# Owned document\r\n\r\nUnrelated prose.\r\n\r\n```mermaid\r\n'
  const middle = '```\r\n\r\nPreserved between blocks.\r\n\r\n```mermaid\r\n'
  const suffix = '```\r\n\r\n```text\r\nUnrelated fenced text.\r\n```\r\n'
  const initial = prefix + first + middle + second + suffix
  await writeFile(path, initial, { flag: 'wx' })
  const { writes, unexpected } = auditRequests(page)
  try {
    await login(page, true)
    await choose(page, name)
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await editor.fill(originalSolarSource)
    await live(page)
    await geometry(page)
    await chooseBlock(page, name, 2)
    await expect(editor).toHaveValue(second)
    await editor.fill(originalSolarSource)
    await live(page)
    await chooseBlock(page, name, 1)
    await expect(editor).toHaveValue(originalSolarSource)
    expect(writes).toHaveLength(0)
    expect(await readFile(path, 'utf8')).toBe(initial)
    await save(page)
    expect(await readFile(path, 'utf8')).toBe(prefix + originalSolarSource + middle + second + suffix)
    await chooseBlock(page, name, 2)
    await expect(editor).toHaveValue(originalSolarSource)
    await save(page)
    expect(await readFile(path, 'utf8')).toBe(prefix + originalSolarSource + middle + originalSolarSource + suffix)
    expect(writes).toHaveLength(2)
    for (const body of writes)
      expect(JSON.parse(body)).toMatchObject({ path: name, source: originalSolarSource, selector: { kind: 'markdown' } })
    await page.reload()
    for (const index of [1, 2]) {
      await chooseBlock(page, name, index)
      await expect(editor).toHaveValue(originalSolarSource)
      await live(page)
      await geometry(page)
    }
    expect(unexpected).toEqual([])
    process.stdout.write(`${JSON.stringify({ markdownInput: originalSolarSha256, explicitIndividualSaves: 2, unrelatedBytesPreserved: true, sourceDraftRequestDiskReloadEqual: true })}\n`)
  }
  finally { await rm(path) }
})

test('ordinary comparison and style variants retain safe presentation while nearby attacks fail before DOM effects', async ({ page }) => {
  test.setTimeout(90000)
  await login(page, true)
  await choose(page, 'welcome.mmd')
  const editor = page.getByLabel('Mermaid source', { exact: true })
  await editor.fill('flowchart LR\nWarm --> Preview')
  await live(page)
  const { writes, unexpected } = auditRequests(page)
  for (const source of [
    'graph LR\nA["Voltage <= 250V<br />Ready"] --> B & C\nclassDef warm fill:#abc,stroke:#123456,stroke-width:1.5px,stroke-dasharray:2 4\nclass A,B,C warm',
    'flowchart TD; A["x<10; y < limit"] --> B; classDef first,second fill:#ABC,stroke:#123456,stroke-width:1.5,stroke-dasharray:2px 4px; class A first; class B second;',
  ]) {
    await editor.fill(source)
    await live(page)
    const styles = await page.locator('.diagram-graphic g.node').evaluateAll(nodes => nodes.map((node) => {
      const style = getComputedStyle(node.querySelector('rect')!)
      return [style.fill, style.stroke, style.strokeWidth, style.strokeDasharray]
    }))
    const label = /A\["([^"]+)"\]/.exec(source)![1]!.replace(/<br \/>/g, '')
    expect(compact(await page.locator('.diagram-graphic g.node').first().textContent() ?? '')).toBe(compact(label))
    for (const style of styles)
      expect(style).toEqual(['rgb(170, 187, 204)', 'rgb(18, 52, 86)', '1.5px', '2px, 4px'])
    await expect(editor).toHaveValue(source)
  }
  const valid = await page.locator('.diagram-graphic').innerHTML()
  for (const statement of [
    'A --> B %% classDef evil background-image:image-set("/diagram-resource-probe")',
    '%% classDef evil font-family:remote',
    'classDef evil fill:url(/diagram-resource-probe)',
    'classDef evil fill:#fff; @import "/diagram-resource-probe"',
    'classDef evil font-family:remote',
    'classDef evil fill:#fff!important',
    'classDef evil stroke-width:2px trailing',
    'classDef evil stroke-dasharray:5 5; style A background:red',
    'classDef evil fill:expression(alert(1))',
    'classDef evil fill:#fff\\;background:red',
    'classDef x}body{ fill:#fff',
    'class A evil[onclick]',
    'A["Text <img src=/diagram-resource-probe onerror=window.pwned=1>"]',
    'A["Text <br onload=window.pwned=1>"]',
    'A["Text &#60;img src=/diagram-resource-probe>"]',
    'A["Text #60;img#62;"]',
    '%%{init:{"securityLevel":"loose"}}%%',
    'click A callback',
  ]) {
    const source = `flowchart LR\nA["Voltage < 250V"] --> B & C\n${statement}`
    await editor.fill(source)
    await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
    await expect(page.getByText('Last valid preview', { exact: true })).toBeVisible()
    await expect(page.getByText(/Preview uses plain Mermaid only\./)).toBeVisible()
    expect(await page.locator('.diagram-graphic').innerHTML()).toBe(valid)
    await expect(editor).toHaveValue(source)
    expect(await page.evaluate(() => Reflect.has(window, 'pwned'))).toBe(false)
    await expect(page.locator('.render-scratch')).toHaveCount(0)
    await expect(page.locator('foreignObject,image,[onload],[onerror]')).toHaveCount(0)
  }
  await editor.fill('flowchart LR\nRecovered --> Preview')
  await live(page)
  expect(writes).toEqual([])
  expect(unexpected).toEqual([])
})
