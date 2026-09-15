import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
const enabled = process.env.MERDECK_TEST_PERFORMANCE === 'true'
if (!root)
  throw new Error('An explicit disposable sample root is required')

interface Stage { name: string, at: number, parseMs?: number, compactMs?: number, message?: string }
interface Sample { apiMs: number, readyMs: number, visibleMs: number, heartbeatWorstMs: number, longTaskWorstMs: number, rendered: number, stages: Stage[], measures: { name: string, duration: number }[] }
function percentile(values: number[], ratio: number) {
  return values.toSorted((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)]!
}

async function heartbeat(page: Parameters<typeof login>[0]) {
  await page.evaluate(() => {
    let previous = performance.now()
    let worst = 0
    let measuredAfter = previous
    const tick = () => {
      const now = performance.now()
      worst = Math.max(worst, now - previous)
      previous = now
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    let longTaskWorst = 0
    new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        if (entry.startTime >= measuredAfter)
          longTaskWorst = Math.max(longTaskWorst, entry.duration)
      }
    }).observe({ type: 'longtask' })
    const stages: { name: string, at: number, parseMs?: number, compactMs?: number }[] = []
    window.addEventListener('merdeck-markdown-stage', event => stages.push((event as CustomEvent<Stage>).detail))
    ;(window as typeof window & { markdownMetrics?: { read: () => { heartbeatWorstMs: number, longTaskWorstMs: number, stages: typeof stages, measures: { name: string, duration: number }[] }, reset: () => void } }).markdownMetrics = {
      read: () => ({ heartbeatWorstMs: worst, longTaskWorstMs: longTaskWorst, stages, measures: performance.getEntriesByType('measure').filter(entry => entry.name.startsWith('merdeck-markdown:')).map(entry => ({ name: entry.name, duration: entry.duration })) }),
      reset: () => {
        previous = performance.now()
        measuredAfter = previous
        worst = 0
        longTaskWorst = 0
        stages.splice(0)
        performance.clearMeasures('merdeck-markdown:api-json')
        performance.clearMeasures('merdeck-markdown:api-decode')
      },
    }
  })
}

async function openSample(page: Parameters<typeof login>[0], name: string, visible: 'text' | 'diagram'): Promise<Sample> {
  await heartbeat(page)
  const started = await page.evaluate(() => performance.now())
  await page.evaluate(() => (window as typeof window & { markdownMetrics?: { reset: () => void } }).markdownMetrics?.reset())
  const response = page.waitForResponse(item => item.url().includes('/api/diagrams/document?') && new URL(item.url()).searchParams.get('path') === name)
  await page.getByRole('button', { name, exact: true }).click()
  await response
  const apiMs = (await page.evaluate(() => performance.now())) - started
  const article = page.getByRole('article', { name: 'Markdown document', exact: true })
  if (visible === 'text')
    await expect(article.getByText('Large document', { exact: true })).toBeVisible()
  else
    await expect(article.locator('.document-diagram.selected svg')).toBeVisible()
  const readyMs = (await page.evaluate(() => performance.now())) - started
  const rendered = await article.locator('.document-diagram svg').count()
  const metrics = await page.evaluate(() => (window as typeof window & { markdownMetrics?: { read: () => { heartbeatWorstMs: number, longTaskWorstMs: number, stages: Stage[], measures: { name: string, duration: number }[] } } }).markdownMetrics?.read() ?? { heartbeatWorstMs: 0, longTaskWorstMs: 0, stages: [], measures: [] })
  return { apiMs, readyMs, visibleMs: readyMs, ...metrics, rendered }
}

test('production Chromium measures worker document readiness and viewport-diagram deferral', async ({ page }) => {
  test.skip(!enabled, 'Performance evidence is collected only by the explicit production measurement command.')
  test.setTimeout(180000)
  await mkdir(join(process.cwd(), '..', 'tmp'), { recursive: true })
  const id = randomUUID()
  const largeNames = Array.from({ length: 4 }, (_, index) => `markdown-performance-large-${id}-${index}.md`)
  const diagramsNames = Array.from({ length: 4 }, (_, index) => `markdown-performance-diagrams-${id}-${index}.md`)
  const oneMiB = 1024 * 1024
  // A single ordinary prose block isolates parser/worker transfer cost from an intentionally
  // pathological thousands-of-elements layout while still exercising an exact 1 MiB document.
  const body = 'A worker parses this complete Markdown document without blocking input. '
  const large = (`# Large document\n\n${body.repeat(Math.ceil((oneMiB - 20) / body.length))}`).slice(0, oneMiB)
  const diagrams = `# Large document\n\n${Array.from({ length: 100 }, (_, index) => `\`\`\`mermaid\nflowchart LR\nN${index} --> N${index + 1}\n\`\`\``).join('\n\n')}\n`
  await Promise.all([...largeNames.map(name => writeFile(join(root, name), large, { flag: 'wx' })), ...diagramsNames.map(name => writeFile(join(root, name), diagrams, { flag: 'wx' }))])
  try {
    await page.setViewportSize({ width: 1440, height: 920 })
    await login(page)
    await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
    await expect(page.getByRole('button', { name: largeNames[0]!, exact: true })).toBeVisible()
    const largeSamples: Sample[] = []
    const diagramSamples: Sample[] = []
    for (const name of largeNames) {
      largeSamples.push(await openSample(page, name, 'text'))
    }
    for (const name of diagramsNames) {
      diagramSamples.push(await openSample(page, name, 'diagram'))
      expect(diagramSamples.at(-1)!.rendered).toBeLessThan(100)
    }
    const summarize = (samples: Sample[]) => Object.fromEntries((['apiMs', 'readyMs', 'visibleMs', 'heartbeatWorstMs', 'longTaskWorstMs'] as const).map(key => [key, { median: percentile(samples.map(sample => sample[key]), 0.5), p95: percentile(samples.map(sample => sample[key]), 0.95), worst: Math.max(...samples.map(sample => sample[key])) }]))
    const evidence = { environment: { browser: 'Chromium via Playwright', bytes: new TextEncoder().encode(large).byteLength, diagrams: 100, samples: 4 }, large: { samples: largeSamples, summary: summarize(largeSamples) }, diagrams: { samples: diagramSamples, summary: summarize(diagramSamples) }, threshold: { inputBlockingMs: 100, metric: 'post-API worker parse/render main-thread long task; requestAnimationFrame gap is recorded separately as scheduling pressure', result: Math.max(...largeSamples.map(sample => sample.longTaskWorstMs)) < 100 ? 'pass' : 'investigate' } }
    await writeFile(join(process.cwd(), '..', 'tmp/markdown-document-performance.json'), JSON.stringify(evidence, null, 2))
    expect(evidence.threshold.result).toBe('pass')
  }
  finally {
    await Promise.all([...largeNames, ...diagramsNames].map(name => rm(join(root, name), { force: true })))
  }
})
