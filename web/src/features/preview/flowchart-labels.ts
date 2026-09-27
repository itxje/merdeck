export interface FlowToken { name: string, start: number, end: number }

export interface LabelSite {
  nodeId: string
  /** Label text exactly as written in the source, or the id of a node without a label. */
  text: string
  /** Source range to select when locating the node. */
  start: number
  end: number
  editable: boolean
  form: 'quoted' | 'plain' | 'bare' | 'unsupported'
  /** Range replaced when writing: the quoted text, the whole bracket interior, or an insertion point after the id. */
  replaceStart: number
  replaceEnd: number
}

export interface FlowchartModel {
  vertices: Map<string, { text: string, type?: string | undefined, labelType: string, domId: string }>
  edges: { start: string, end: string, text: string, type?: string | undefined, stroke?: string | undefined, length?: number | undefined }[]
  subgraphs: { id: string, title: string, nodes: string[] }[]
}

export class LabelEditError extends Error {}
export const sourceOnlyLabelMessage = 'This label can only be edited in the source.'
export const refusedLabelMessage = 'This text is not allowed in preview labels. Avoid HTML tags, entity codes and resource references such as url( or ![.'
export const unsafeLabelMessage = 'This label could not be changed safely on the diagram. Edit it in the source instead.'

// Token names from Mermaid's flowchart grammar. A vertex definition is an id immediately followed by a shape.
const idTokens = new Set(['NODE_STRING', 'NUM', 'DOWN', 'MINUS', 'DEFAULT', 'COMMA', 'COLON', 'AMP', 'BRKT', 'MULT', 'UNICODE_TEXT'])
const shapeStarts = new Set(['SQS', 'PS', 'DIAMOND_START', 'TAGEND', 'DOUBLECIRCLESTART', '(-', 'STADIUMSTART', 'SUBROUTINESTART', 'VERTEX_WITH_PROPS_START', 'CYLINDERSTART', 'TRAPSTART', 'INVTRAPSTART'])
const shapeEnds = new Set(['SQE', 'PE', 'DIAMOND_STOP', 'DOUBLECIRCLEEND', '-)', 'STADIUMEND', 'SUBROUTINEEND', 'CYLINDEREND', 'TRAPEND', 'INVTRAPEND'])
const statementEnds = new Set(['NEWLINE', 'SEMI', 'end', 'EOF'])
const labelBreak = /<br(?: ?\/)?>/i

function run(tokens: FlowToken[], from: number, names: Set<string>) {
  let index = from
  while (index < tokens.length && names.has(tokens[index]!.name) && (index === from || tokens[index]!.start === tokens[index - 1]!.end))
    index++
  return index
}

function after(tokens: FlowToken[], from: number, name: string) {
  let index = from
  while (index < tokens.length && tokens[index]!.name !== name)
    index++
  return index + 1
}

function shapeSite(source: string, nodeId: string, content: FlowToken[], interiorStart: number, interiorEnd: number): LabelSite {
  const only = content.length === 1 ? content[0]! : undefined
  if (only?.name === 'STR')
    return { nodeId, text: source.slice(only.start, only.end), start: only.start, end: only.end, editable: true, form: 'quoted', replaceStart: only.start, replaceEnd: only.end }
  const raw = source.slice(interiorStart, interiorEnd)
  const text = raw.trim()
  const start = interiorStart + (text ? raw.length - raw.trimStart().length : 0)
  const plain = content.length > 0 && content.every(token => token.name === 'TEXT')
  return { nodeId, text, start, end: start + text.length, editable: plain, form: plain ? 'plain' : 'unsupported', replaceStart: interiorStart, replaceEnd: interiorEnd }
}

function visit(source: string, statement: FlowToken[], labelled: Map<string, LabelSite>, bare: Map<string, LabelSite>) {
  let index = 0
  while (index < statement.length) {
    const token = statement[index]!
    if (token.name === 'START_LINK') {
      index = after(statement, index + 1, 'LINK')
    }
    else if (token.name === 'PIPE') {
      index = after(statement, index + 1, 'PIPE')
    }
    else if (token.name === 'STYLE_SEPARATOR') {
      index = run(statement, index + 1, idTokens)
    }
    else if (!idTokens.has(token.name)) {
      index++
    }
    else {
      const idEnd = run(statement, index, idTokens)
      const last = statement[idEnd - 1]!
      const nodeId = source.slice(token.start, last.end)
      const open = statement[idEnd]
      if (!open || !shapeStarts.has(open.name) || open.start !== last.end) {
        if (!bare.has(nodeId))
          bare.set(nodeId, { nodeId, text: nodeId, start: token.start, end: last.end, editable: true, form: 'bare', replaceStart: last.end, replaceEnd: last.end })
        index = idEnd
      }
      else {
        const contentStart = run(statement, idEnd, shapeStarts)
        let contentEnd = contentStart
        while (contentEnd < statement.length && !shapeEnds.has(statement[contentEnd]!.name))
          contentEnd++
        labelled.set(nodeId, shapeSite(source, nodeId, statement.slice(contentStart, contentEnd), statement[contentStart - 1]!.end, statement[contentEnd]?.start ?? source.length))
        index = run(statement, contentEnd, shapeEnds)
      }
    }
  }
}

/** Finds, for every node, the source text Mermaid displays: its last labelled definition, else its first bare occurrence. */
export function labelSites(source: string, tokens: FlowToken[]): Map<string, LabelSite> {
  const labelled = new Map<string, LabelSite>()
  const bare = new Map<string, LabelSite>()
  let start = 0
  while (start < tokens.length) {
    let end = start
    while (end < tokens.length && !statementEnds.has(tokens[end]!.name))
      end++
    const statement = tokens.slice(start, end)
    // Only vertex and edge statements define nodes; headers, subgraphs, classes and directions are skipped.
    if (idTokens.has(statement.find(token => token.name !== 'SPACE')?.name ?? ''))
      visit(source, statement, labelled, bare)
    start = end + 1
  }
  return new Map([...bare, ...labelled])
}

export function writeLabel(source: string, site: LabelSite, value: string): { source: string, written: string } {
  if (!site.editable)
    throw new LabelEditError(sourceOnlyLabelMessage)
  const text = value.trim().split(/\r\n?|\n/).map(line => line.trim()).join(labelBreak.exec(site.text)?.[0] ?? '<br>')
  if (!text)
    throw new LabelEditError('Enter a label, or press Escape to keep the current one.')
  if (/["`]/.test(text))
    throw new LabelEditError('Labels edited on the diagram cannot contain double quotes or backticks.')
  const written = site.form === 'quoted' || /[[\](){}|/\\<>]/.test(text) ? `"${text}"` : text
  const replacement = site.form === 'quoted' ? text : site.form === 'bare' ? `[${written}]` : written
  return { source: source.slice(0, site.replaceStart) + replacement + source.slice(site.replaceEnd), written }
}

/** True when only the chosen node's text differs; a label added to a bare node may also make its default shape explicit. */
export function sameExceptLabel(before: FlowchartModel, after: FlowchartModel, nodeId: string, expected: string): boolean {
  if (before.vertices.size !== after.vertices.size || JSON.stringify(before.edges) !== JSON.stringify(after.edges) || JSON.stringify(before.subgraphs) !== JSON.stringify(after.subgraphs))
    return false
  for (const [id, vertex] of before.vertices) {
    const next = after.vertices.get(id)
    if (!next)
      return false
    if (id === nodeId ? next.text !== expected || (next.type !== vertex.type && !(vertex.type === undefined && next.type === 'square')) : next.text !== vertex.text || next.type !== vertex.type || next.labelType !== vertex.labelType)
      return false
  }
  return true
}
