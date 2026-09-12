import mermaid from 'mermaid'
import { expect, it, vi } from 'vitest'
import { linkedIndex } from '../../test/linked-flowchart'
import { originalFlowSource } from '../../test/original-flow'
import { renderDiagram } from './renderer'

vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: vi.fn() } }))
it('serializes renderer work, cancels stale queued sources and sanitizes returned SVG', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect: vi.fn(), getImageData: () => ({ data: [120, 120, 120, 255] }) } as unknown as CanvasRenderingContext2D)
  let finish: (value: { svg: string, diagramType: string }) => void = () => {}
  vi.mocked(mermaid.render).mockImplementationOnce(() => new Promise((resolve) => {
    finish = resolve
  }))
  const first = renderDiagram('flowchart LR\nA-->B')
  let current = true
  const second = renderDiagram('flowchart LR\nC-->D', () => current)
  await Promise.resolve()
  expect(mermaid.render).toHaveBeenCalledTimes(1)
  current = false
  finish({ diagramType: 'flowchart', svg: '<svg xmlns="http://www.w3.org/2000/svg"><text onclick="alert(1)">Safe</text><image href="https://example.test/tracker"/></svg>' })
  expect(await first).toContain('Safe')
  expect(await second).toBeNull()
  expect(mermaid.render).toHaveBeenCalledTimes(1)
  expect(document.querySelector('.render-scratch')).toBeNull()
  vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('Invalid syntax'))
  await expect(renderDiagram('flowchart LR\nA-->')).rejects.toThrow('Invalid syntax')
  expect(document.querySelector('.render-scratch')).toBeNull()
  vi.mocked(mermaid.render).mockResolvedValueOnce({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Recovered</text></svg>', diagramType: 'flowchart' })
  expect(await renderDiagram('flowchart LR\nA-->B')).toContain('Recovered')
})

it('normalizes only bare break tokens in private render input and retains trusted settings', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect: vi.fn(), getImageData: () => ({ data: [120, 120, 120, 255] }) } as unknown as CanvasRenderingContext2D)
  vi.mocked(mermaid.render).mockClear().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>First</text><text>Second</text></svg>', diagramType: 'flowchart' })
  const draft = Object.freeze({ source: 'flowchart LR\nA["First<BR />Second<br>Third"]' })
  await renderDiagram(draft.source)
  expect(mermaid.render).toHaveBeenLastCalledWith(expect.any(String), 'flowchart LR\nA["First<br/>Second<br/>Third"]', expect.any(HTMLElement))
  expect(draft.source).toBe('flowchart LR\nA["First<BR />Second<br>Third"]')
  await renderDiagram(originalFlowSource)
  expect(mermaid.render).toHaveBeenLastCalledWith(expect.any(String), originalFlowSource, expect.any(HTMLElement))
  expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ securityLevel: 'strict', htmlLabels: false, maxTextSize: 32000, maxEdges: 500, flowchart: expect.objectContaining({ htmlLabels: false }) }))
  await expect(renderDiagram('flowchart LR\nA[First<br onload=alert(1)>Second]')).rejects.toThrow('plain Mermaid')
  expect(mermaid.render).toHaveBeenCalledTimes(2)
  expect(document.querySelector('.render-scratch')).toBeNull()
})

it('rejects unsafe classes before initialization or measurement DOM and preserves ordinary source bytes', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect: vi.fn(), getImageData: () => ({ data: [120, 120, 120, 255] }) } as unknown as CanvasRenderingContext2D)
  vi.mocked(mermaid.initialize).mockClear()
  vi.mocked(mermaid.render).mockClear().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Safe</text></svg>', diagramType: 'flowchart' })
  const append = vi.spyOn(document.body, 'append')
  for (const declaration of ['fill:url(/probe)', 'fill:#fff!important', 'stroke-width:2px trailing', 'stroke-dasharray:5 5;click A callback', 'font-family:remote'])
    await expect(renderDiagram(`flowchart LR\nA["Value < 250V"] --> B & C\nclassDef safe ${declaration}\nclass A safe`)).rejects.toThrow('plain Mermaid')
  await expect(renderDiagram('flowchart LR\nA --> B %% classDef evil background-image:image-set("/probe")')).rejects.toThrow('plain Mermaid')
  expect(mermaid.initialize).not.toHaveBeenCalled()
  expect(mermaid.render).not.toHaveBeenCalled()
  expect(append).not.toHaveBeenCalled()
  const { originalSolarSource } = await import('../../test/original-solar')
  const draft = Object.freeze({ source: originalSolarSource })
  await renderDiagram(draft.source)
  expect(draft.source).toBe(originalSolarSource)
  expect(mermaid.render).toHaveBeenLastCalledWith(expect.any(String), originalSolarSource, expect.any(HTMLElement))
  expect(document.querySelector('.render-scratch')).toBeNull()
  append.mockRestore()
})

it('themes subgraph containers from the dedicated cluster tokens', async () => {
  const swatches: Record<string, number[]> = { '--diagram-cluster-bg': [250, 250, 250, 255], '--diagram-cluster-border': [200, 200, 200, 255], '--foreground': [20, 20, 20, 255] }
  const context = { fillStyle: '', fillRect: vi.fn(), getImageData: () => ({ data: swatches[context.fillStyle] ?? [120, 120, 120, 255] }) }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  const computed = vi.spyOn(window, 'getComputedStyle').mockReturnValue({ getPropertyValue: (name: string) => name } as unknown as CSSStyleDeclaration)
  vi.mocked(mermaid.initialize).mockClear()
  vi.mocked(mermaid.render).mockClear().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><g class="cluster"><rect/></g></svg>', diagramType: 'flowchart' })
  await renderDiagram('flowchart LR\nsubgraph Battery\nA-->B\nend')
  expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ themeVariables: expect.objectContaining({ clusterBkg: '#fafafa', clusterBorder: '#c8c8c8', titleColor: '#141414', tertiaryColor: '#787878' }) }))
  computed.mockRestore()
})

it('keeps links out of Mermaid input and both sanitization stages while preserving the draft', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillStyle: '', fillRect: vi.fn(), getImageData: () => ({ data: [120, 120, 120, 255] }) } as unknown as CanvasRenderingContext2D)
  const computed = window.getComputedStyle.bind(window)
  const measured: string[] = []
  const measurement = vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    if (element.closest('.render-scratch'))
      measured.push(element.outerHTML)
    return computed(element)
  })
  vi.mocked(mermaid.render).mockClear().mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><g class="node" onclick="alert(1)"><text>Safe</text></g></a><image href="https://example.test/probe"/><foreignObject><p>Unsafe</p></foreignObject></svg>', diagramType: 'flowchart' })
  const source = `---\ntitle: Diagram overview\n---\n${linkedIndex}`
  const result = await renderDiagram(source)
  const input = vi.mocked(mermaid.render).mock.calls[0]![1]
  expect(input).toContain('title: Diagram overview')
  expect(input).toContain('classDef entry fill:#e0f2fe')
  expect(input).toContain('ROOT --> A')
  expect(input).not.toMatch(/\bclick\b|\.mmd/)
  expect(source.match(/\bclick\b/g)).toHaveLength(17)
  expect(measured.length).toBeGreaterThan(0)
  for (const svg of [...measured, result!])
    expect(svg).not.toMatch(/<a\b|href|foreignObject|<image\b|onclick|javascript:|https:/)
  expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ securityLevel: 'strict', htmlLabels: false, flowchart: expect.objectContaining({ htmlLabels: false }) }))
  measurement.mockRestore()
})
