import type { MermaidConfig } from 'mermaid'
import type { FlowchartModel, FlowToken, LabelSite } from './flowchart-labels'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'

import { LabelEditError, labelSites, refusedLabelMessage, sameExceptLabel, sourceOnlyLabelMessage, unsafeLabelMessage, writeLabel } from './flowchart-labels'
import { bareLabelBreak, previewLimit, renderSource, validateSource } from './source-policy'

export { previewLimit, validateSource } from './source-policy'
let sequence = 0
let queue: Promise<unknown> = Promise.resolve()
const safeProperties = new Set(['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'white-space', 'display', 'text-decoration'])
const settings: MermaidConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  htmlLabels: false,
  suppressErrorRendering: true,
  secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'maxEdges', 'htmlLabels', 'suppressErrorRendering', 'theme', 'themeVariables', 'fontFamily'],
  maxTextSize: previewLimit,
  maxEdges: 500,
  theme: 'base',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  flowchart: { htmlLabels: false, curve: 'basis', padding: 16, nodeSpacing: 30, rankSpacing: 40 },
}
// Mermaid drops whole-line comments before parsing; blanking them instead keeps token offsets aligned with the draft.
const commentLine = /^\s*%%(?!\{)[^\n]+\n?/gm

interface FlowParser {
  lexer: { setInput: (input: string, yy: object) => void, lex: () => number | string, match: string, matched: string }
  terminals_: Record<number, string>
}
interface FlowDatabase {
  getVertices: () => Map<string, { text?: string, type?: string, labelType: string, domId: string }>
  getEdges: () => { start: string, end: string, text: string, type?: string, stroke?: string, length?: number }[]
  getSubGraphs: () => { id: string, title: string, nodes: string[] }[]
}

function safeValue(value: string) {
  return !/[\\@<>]|url\s*\(|(?:https?|data|javascript):|expression\s*\(/i.test(value)
}

export function sanitizeSvg(svg: string): string {
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ['a', 'foreignObject', 'image', 'script', 'style', 'use', 'animate', 'animateMotion', 'animateTransform', 'set', 'filter'],
    FORBID_ATTR: ['href', 'xlink:href', 'src', 'tabindex'],
    ALLOW_DATA_ATTR: false,
  })
  const doc = new DOMParser().parseFromString(clean, 'image/svg+xml')
  const root = doc.documentElement
  if (root.localName !== 'svg' || doc.querySelector('parsererror'))
    throw new Error('The renderer returned an invalid diagram.')
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on') || name === 'style' || (name === 'id' && !/^[\w-]+$/.test(attribute.value))) {
        element.removeAttribute(attribute.name)
      }
      else if (name === 'marker-end' || name === 'marker-start' || name === 'clip-path') {
        if (!/^url\(#[\w-]+\)$/.test(attribute.value))
          element.removeAttribute(attribute.name)
      }
      else if (!safeValue(attribute.value)) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  return new XMLSerializer().serializeToString(root)
}
function tokenHex(name: string) {
  const context = document.createElement('canvas').getContext('2d')
  if (!context)
    throw new Error('Color conversion is unavailable in this browser.')
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  context.fillRect(0, 0, 1, 1)
  return `#${Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`
}
async function render(source: string): Promise<string> {
  const projected = renderSource(source)
  mermaid.initialize({
    ...settings,
    themeVariables: { fontSize: '14px', primaryColor: tokenHex('--muted'), primaryTextColor: tokenHex('--foreground'), primaryBorderColor: tokenHex('--ring'), lineColor: tokenHex('--muted-foreground'), secondaryColor: tokenHex('--card'), tertiaryColor: tokenHex('--background'), background: tokenHex('--background'), clusterBkg: tokenHex('--diagram-cluster-bg'), clusterBorder: tokenHex('--diagram-cluster-border'), titleColor: tokenHex('--foreground') },
  })
  const id = `diagram-${++sequence}`
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.className = 'render-scratch'
  document.body.append(host)
  try {
    // Canonical breaks become SVG text rows with HTML labels disabled. Draft bytes stay untouched.
    const { svg } = await mermaid.render(id, projected.replace(bareLabelBreak, '<br/>'), host)
    // Only generated output enters this private measurement host. Strip active SVG
    // first; styles are read from the renderer's already installed stylesheet.
    const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true }, FORBID_TAGS: ['a', 'foreignObject', 'image', 'script', 'use', 'animate', 'set'], FORBID_ATTR: ['href', 'xlink:href'] })
    host.innerHTML = clean
    const node = host.querySelector('svg')
    if (!node)
      throw new Error('No diagram was produced.')
    for (const element of [node, ...node.querySelectorAll('*')]) {
      const computed = getComputedStyle(element)
      for (const property of safeProperties) {
        const value = computed.getPropertyValue(property)
        if (value && safeValue(value))
          element.setAttribute(property, value)
      }
    }
    readableNodeLabels(node)
    return sanitizeSvg(node.outerHTML)
  }
  finally {
    host.remove()

    document.getElementById(`d${id}`)?.remove()
  }
}
function solidColor(element: Element): number[] | undefined {
  const channels = /^rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,/\s]+([\d.]+))?\)$/.exec(element.getAttribute('fill') ?? '')
  if (!channels || Number(channels[4] ?? 1) < 0.5 || Number(element.getAttribute('fill-opacity') ?? 1) < 0.5)
    return undefined
  return channels.slice(1, 4).map(Number)
}
function contrast(first: number[], second: number[]) {
  const luminance = (color: number[]) => {
    const [red, green, blue] = color.map((value) => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!
  }
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (light! + 0.05) / (dark! + 0.05)
}
/** Author fills can defeat the theme text colour, so unreadable node labels switch to the neutral with more contrast. */
export function readableNodeLabels(svg: Element): void {
  for (const node of svg.querySelectorAll('g.node')) {
    const fill = [...node.querySelectorAll('rect, polygon, path, circle, ellipse')].filter(element => !element.closest('.label')).map(solidColor).find(Boolean)
    if (!fill)
      continue
    const replacement = contrast(fill, [23, 23, 23]) >= contrast(fill, [250, 250, 250]) ? 'rgb(23, 23, 23)' : 'rgb(250, 250, 250)'
    for (const text of node.querySelectorAll('text, tspan')) {
      const color = solidColor(text)
      if (!color || contrast(color, fill) < 4.5)
        text.setAttribute('fill', replacement)
    }
  }
}
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work)
  queue = next.catch(() => undefined)
  return next
}
export function renderDiagram(source: string, isCurrent: () => boolean = () => true): Promise<string | null> {
  return enqueue(async () => isCurrent() ? render(source) : null)
}

async function parseFlowchart(source: string): Promise<{ model: FlowchartModel, parser: FlowParser } | null> {
  mermaid.initialize(settings)
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(source.replace(bareLabelBreak, '<br/>'))
  const parser = (diagram.parser as unknown as { parser?: FlowParser }).parser
  if (!diagram.type.startsWith('flowchart') || !parser?.lexer)
    return null
  const database = diagram.db as unknown as FlowDatabase
  const vertices: FlowchartModel['vertices'] = new Map()
  for (const [id, vertex] of database.getVertices())
    vertices.set(id, { text: vertex.text ?? '', type: vertex.type, labelType: vertex.labelType, domId: vertex.domId })
  return {
    parser,
    model: {
      vertices,
      edges: database.getEdges().map(edge => ({ start: edge.start, end: edge.end, text: edge.text, type: edge.type, stroke: edge.stroke, length: edge.length })),
      subgraphs: database.getSubGraphs().map(group => ({ id: group.id, title: group.title, nodes: [...group.nodes] })),
    },
  }
}

// Mermaid's own lexer provides exact token offsets, so labels are located the same way Mermaid reads them.
function tokenize(source: string, parser: FlowParser): FlowToken[] {
  const text = source.replace(commentLine, line => line.replace(/[^\n]/g, ' '))
  let first = true
  parser.lexer.setInput(text, { lex: { firstGraph: () => {
    const value = first
    first = false
    return value
  } } })
  const tokens: FlowToken[] = []
  while (tokens.length <= text.length) {
    const code = parser.lexer.lex()
    const name = typeof code === 'number' ? parser.terminals_[code] ?? '' : code
    const end = parser.lexer.matched.length
    tokens.push({ name, start: end - parser.lexer.match.length, end })
    if (name === 'EOF')
      return tokens
  }
  throw new LabelEditError(sourceOnlyLabelMessage)
}

/** Label sites keyed by the Mermaid DOM id that rendered node groups carry, or null for other diagram types. */
export function inspectFlowchart(source: string, isCurrent: () => boolean = () => true): Promise<Map<string, LabelSite> | null> {
  return enqueue(async () => {
    if (!isCurrent())
      return null
    validateSource(source)
    const parsed = await parseFlowchart(source)
    if (!parsed)
      return null
    const sites = labelSites(source, tokenize(source, parsed.parser))
    const byDomId = new Map<string, LabelSite>()
    for (const [id, vertex] of parsed.model.vertices) {
      const site = sites.get(id)
      if (site)
        byDomId.set(vertex.domId, site)
    }
    return byDomId
  })
}

async function relabel(source: string, nodeId: string, value: string): Promise<string> {
  validateSource(source)
  const before = await parseFlowchart(source)
  const site = before && labelSites(source, tokenize(source, before.parser)).get(nodeId)
  if (!before || !site)
    throw new LabelEditError(sourceOnlyLabelMessage)
  const { source: next, written } = writeLabel(source, site, value)
  try {
    validateSource(next)
  }
  catch {
    throw new LabelEditError(refusedLabelMessage)
  }
  // Accept the edit only if Mermaid reads the new source as the same diagram with just this label changed.
  const after = await parseFlowchart(next)
  const probe = await parseFlowchart(`flowchart TD\nlabelProbe[${written}]`)
  const expected = probe?.model.vertices.get('labelProbe')?.text
  if (!after || expected === undefined || !sameExceptLabel(before.model, after.model, nodeId, expected))
    throw new LabelEditError(unsafeLabelMessage)
  return next
}

/** Returns the source with one flowchart node label replaced, or rejects with a message for the person editing. */
export function editFlowchartLabel(source: string, nodeId: string, value: string): Promise<string> {
  return enqueue(async () => {
    try {
      return await relabel(source, nodeId, value)
    }
    catch (cause) {
      throw cause instanceof LabelEditError ? cause : new LabelEditError(unsafeLabelMessage)
    }
  })
}
