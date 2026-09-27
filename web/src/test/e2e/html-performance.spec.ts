import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
const enabled = process.env.MERDECK_TEST_HTML_PERFORMANCE === 'true'
if (!root)
  throw new Error('An explicit disposable sample root is required')

interface Stage { name: string, at: number, projectMs?: number }

test('production Chromium bounds large-text and adversarial-node HTML work', async ({ page }) => {
  test.skip(!enabled, 'Performance evidence is collected only by the explicit production measurement command.')
  test.setTimeout(90000)
  const id = randomUUID()
  const largeName = `html-performance-large-${id}.html`
  const nodesName = `html-performance-nodes-${id}.html`
  const oneMiB = 1024 * 1024
  const prefix = '<!doctype html>\n<h1>Large HTML document</h1>\n<p>'
  const suffix = 'MERDECK_HTML_COMPLETE_TAIL</p>\n'
  const paragraph = 'Worker parsed HTML text &amp; content. '.repeat(Math.ceil(oneMiB / 30)).slice(0, oneMiB - prefix.length - suffix.length)
  const large = prefix + paragraph + suffix
  const nodes = `<!doctype html><h1>Many HTML nodes</h1>${'<p><strong>bounded</strong></p>'.repeat(10000)}`
  await writeFile(join(root, largeName), large, { flag: 'wx' })
  await writeFile(join(root, nodesName), nodes, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 920 })
    await login(page)
    await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
    await page.evaluate(() => {
      let worst = 0
      let measuredAfter = performance.now()
      const stages: Stage[] = []
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          if (entry.startTime >= measuredAfter)
            worst = Math.max(worst, entry.duration)
        }
      }).observe({ type: 'longtask' })
      window.addEventListener('merdeck-html-stage', event => stages.push((event as CustomEvent<Stage>).detail))
      ;(window as typeof window & { htmlMetrics?: { reset: () => void, read: () => { worst: number, stages: Stage[] } } }).htmlMetrics = {
        reset: () => {
          worst = 0
          measuredAfter = performance.now()
          stages.splice(0)
        },
        read: () => ({ worst, stages }),
      }
    })
    const sample = async (name: string, completion: 'text' | 'truncated') => {
      await page.evaluate(() => (window as typeof window & { htmlMetrics?: { reset: () => void } }).htmlMetrics?.reset())
      const started = await page.evaluate(() => performance.now())
      await page.getByRole('button', { name, exact: true }).click()
      const article = page.getByRole('article', { name: 'HTML document', exact: true })
      await expect(article.getByRole('heading')).toBeVisible()
      const firstVisibleMs = (await page.evaluate(() => performance.now())) - started
      if (completion === 'text') {
        await expect(article.locator('[data-document-text-complete]')).toBeVisible()
        await expect(article).toContainText('MERDECK_HTML_COMPLETE_TAIL')
      }
      else {
        await expect(article.getByText(/Preview truncated/)).toBeVisible()
      }
      const completeMs = (await page.evaluate(() => performance.now())) - started
      const metrics = await page.evaluate(() => (window as typeof window & { htmlMetrics?: { read: () => { worst: number, stages: Stage[] } } }).htmlMetrics?.read() ?? { worst: 0, stages: [] })
      return { firstVisibleMs, completeMs, ...metrics }
    }
    const largeResult = await sample(largeName, 'text')
    const nodesResult = await sample(nodesName, 'truncated')
    const evidence = {
      environment: { browser: 'Chromium via Playwright', largeBytes: new TextEncoder().encode(large).byteLength, adversarialElements: 10000 },
      large: largeResult,
      nodes: nodesResult,
      threshold: { inputBlockingMs: 100, result: Math.max(largeResult.worst, nodesResult.worst) < 100 ? 'pass' : 'investigate' },
    }
    await mkdir(join(process.cwd(), '..', 'tmp'), { recursive: true })
    await writeFile(join(process.cwd(), '..', 'tmp/html-document-performance.json'), JSON.stringify(evidence, null, 2))
    expect(largeResult.stages.some(stage => stage.name === 'worker-message')).toBe(true)
    expect(nodesResult.stages.some(stage => stage.name === 'worker-message')).toBe(true)
    expect(evidence.threshold.result).toBe('pass')
  }
  finally {
    await rm(join(root, largeName), { force: true })
    await rm(join(root, nodesName), { force: true })
  }
})
