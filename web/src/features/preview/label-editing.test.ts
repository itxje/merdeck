import type { FlowchartModel } from './flowchart-labels'
import { describe, expect, it } from 'vitest'
import { originalFlowSource } from '../../test/original-flow'
import { originalSolarSource } from '../../test/original-solar'
import { sameExceptLabel } from './flowchart-labels'
import { editFlowchartLabel, inspectFlowchart } from './renderer'

async function siteOf(source: string, nodeId: string) {
  const sites = await inspectFlowchart(source)
  return [...sites?.values() ?? []].find(site => site.nodeId === nodeId)
}

describe('flowchart label editing through the real Mermaid parser', () => {
  it('locates labels by rendered DOM id and replaces only the chosen one', async () => {
    const source = 'flowchart LR\n  Browse[Browse project] --> Select[Select diagram]\n  Select --> Edit[Edit source]\n'
    const sites = await inspectFlowchart(source)
    expect([...sites!].map(([domId, site]) => [domId, site.nodeId, site.text, source.slice(site.start, site.end), site.form])).toEqual([
      ['flowchart-Browse-0', 'Browse', 'Browse project', 'Browse project', 'plain'],
      ['flowchart-Select-1', 'Select', 'Select diagram', 'Select diagram', 'plain'],
      ['flowchart-Edit-3', 'Edit', 'Edit source', 'Edit source', 'plain'],
    ])
    expect(await editFlowchartLabel(source, 'Select', 'Pick a diagram')).toBe(source.replace('Select diagram', 'Pick a diagram'))
  })

  it.each([
    ['flowchart LR\nB[One] --> B[Two]', 'B', 'Three', 'flowchart LR\nB[One] --> B[Three]'],
    ['flowchart TD\n A["quoted [x]"] --> B', 'A', 'kept (quoted)', 'flowchart TD\n A["kept (quoted)"] --> B'],
    ['flowchart LR\nC[Plain] --> D', 'C', 'Needs (quotes)', 'flowchart LR\nC["Needs (quotes)"] --> D'],
    ['flowchart LR\nStart -- to B -->B\nB --> C', 'B', 'Target', 'flowchart LR\nStart -- to B -->B[Target]\nB --> C'],
    ['flowchart LR\nA -->|B| B', 'B', 'Target', 'flowchart LR\nA -->|B| B[Target]'],
    ['flowchart LR\nM:::warm --> N\nclassDef warm fill:#fff\nclass N warm', 'M', 'Styled', 'flowchart LR\nM[Styled]:::warm --> N\nclassDef warm fill:#fff\nclass N warm'],
    ['flowchart LR\nsubgraph S1["Group"]\nA --> B\nend', 'B', 'Inside', 'flowchart LR\nsubgraph S1["Group"]\nA --> B[Inside]\nend'],
    ['flowchart LR\nx1 e1@--> y', 'y', 'Why', 'flowchart LR\nx1 e1@--> y[Why]'],
    ['%% leading comment\nflowchart LR\nA[One] --> B', 'A', 'Uno', '%% leading comment\nflowchart LR\nA[Uno] --> B'],
    ['graph TD; A[One] --> B; B --> C', 'C', 'Last', 'graph TD; A[One] --> B; B --> C[Last]'],
    ['flowchart LR\nA["First<br/>Second"] --> B', 'A', 'One\nTwo', 'flowchart LR\nA["One<br/>Two"] --> B'],
    ['flowchart LR\nP[Alpha] --> Q', 'P', ' x \n y ', 'flowchart LR\nP["x<br>y"] --> Q'],
    ['flowchart LR\nT2[ spaced ] --> U', 'T2', 'tight', 'flowchart LR\nT2[tight] --> U'],
  ])('writes %j', async (source, nodeId, value, expected) => {
    expect(await editFlowchartLabel(source, nodeId, value)).toBe(expected)
  })

  it.each(['F{{hex}}', 'G>odd]', 'H[(db)]', 'I((circle))', 'J([stadium])', 'K[[sub]]', 'L[/lean/]', 'D(((double)))', 'E(-ellipse-)', 'R(round)', 'Q{rhombus}'])('keeps the shape of %s', async (definition) => {
    const source = `flowchart LR\n${definition} --> Z`
    expect(await editFlowchartLabel(source, definition[0]!, 'Renamed')).toBe(source.replace(definition, definition.replace(/[a-z]+/, 'Renamed')))
  })

  it.each([
    ['Say "hi"', 'double quotes'],
    ['`code`', 'backticks'],
    ['  \n ', 'Enter a label'],
    ['Click here', 'not allowed'],
    ['<img src=x>', 'not allowed'],
  ])('refuses %j', async (value, message) => {
    await expect(editFlowchartLabel('flowchart LR\nA[One] --> B', 'A', value)).rejects.toThrow(message)
  })

  it('keeps markdown labels, unknown nodes and other diagram types in the source', async () => {
    const markdown = 'flowchart LR\nA["`**bold** text`"] --> B'
    expect(await siteOf(markdown, 'A')).toMatchObject({ editable: false, form: 'unsupported' })
    await expect(editFlowchartLabel(markdown, 'A', 'Plain')).rejects.toThrow('only be edited in the source')
    await expect(editFlowchartLabel(markdown, 'Missing', 'Plain')).rejects.toThrow('only be edited in the source')
    expect(await inspectFlowchart('sequenceDiagram\nAlice->>Bob: Hello')).toBeNull()
    expect(await inspectFlowchart('flowchart LR\nA --> B', () => false)).toBeNull()
  })

  it.each([['solar', originalSolarSource], ['flow', originalFlowSource]])('edits every node of the original %s diagram in isolation', async (_name, source) => {
    const sites = [...(await inspectFlowchart(source))!.values()]
    expect(sites.length).toBeGreaterThan(10)
    for (const site of sites) {
      const next = await editFlowchartLabel(source, site.nodeId, `Edited ${site.nodeId}`)
      expect(next.slice(0, site.replaceStart), site.nodeId).toBe(source.slice(0, site.replaceStart))
      expect(next.slice(next.length - (source.length - site.replaceEnd)), site.nodeId).toBe(source.slice(site.replaceEnd))
      expect(next, site.nodeId).toContain(`Edited ${site.nodeId}`)
    }
  }, 60000)

  it('treats any change beyond the chosen label as unsafe', () => {
    const model = (text: string, edge = ''): FlowchartModel => ({
      vertices: new Map([['A', { text, type: 'square', labelType: 'text', domId: 'flowchart-A-0' }], ['B', { text: 'B', labelType: 'text', domId: 'flowchart-B-1' }]]),
      edges: [{ start: 'A', end: 'B', text: edge }],
      subgraphs: [],
    })
    expect(sameExceptLabel(model('Old'), model('New'), 'A', 'New')).toBe(true)
    expect(sameExceptLabel(model('Old'), model('New', 'changed'), 'A', 'New')).toBe(false)
    expect(sameExceptLabel(model('Old'), model('Other'), 'A', 'New')).toBe(false)
    expect(sameExceptLabel(model('Old'), model('New'), 'B', 'B')).toBe(false)
  })
})
