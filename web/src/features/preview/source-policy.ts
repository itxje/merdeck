export const previewLimit = 32000
export const bareLabelBreak = /<br(?: ?\/)?>/gi
export const flowchartHeader = /^\s*(?:%%[^\n]*\n\s*)*(?:flowchart|graph)\b/
const sequenceHeader = /^\s*(?:%%[^\n]*\n\s*)*sequenceDiagram\b/
const classHeader = /^\s*(?:%%[^\n]*\n\s*)*classDiagram\b/
const identifier = '[a-z_][\\w-]*'
const identifiers = `${identifier}(?:,${identifier})*`
const definition = new RegExp(`^classDef[ \\t]+${identifiers}[ \\t]+(\\S.*)$`, 'i')
const styling = new RegExp(`^style[ \\t]+${identifiers}[ \\t]+(\\S.*)$`, 'i')
const assignment = new RegExp(`^class[ \\t]+${identifiers}[ \\t]+${identifier}$`, 'i')
const inlineClass = new RegExp(`:::${identifier}(?=[ \\t;[\\]{}()&]|$)`, 'gi')
// A click may only name a diagram file inside this project; callbacks, addresses and every other
// form stay refused, and following one is the application's navigation, never a rendered link.
const linkStatement = new RegExp(`^click[ \\t]+(${identifier})[ \\t]+"([^"]*)"$`, 'i')
const linkFile = /\.(?:mmd|mermaid|md)$/i
const linkSegment = /^[\w.-]+$/
const pixelNumber = /^(?:\d{1,2}(?:\.\d{1,2})?|100)(?:px)?$/
const colors = /^#(?:[\da-f]{3}|[\da-f]{6})$/i
// A leading front matter block may carry a title and a bounded configuration, in either order and
// at most once each. `config` there is the same surface as a configuration directive, so it admits
// only a diagram section holding switches and bounded whole numbers: no value may carry text, and
// no key that spells CSS, a font, a theme, a layout or an address can be expressed at all.
const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const frontMatterEntry = /^([ \t]*)([a-z][\w-]*):(.*)$/i
const configSections = new Set(['flowchart', 'sequence', 'gantt', 'state', 'er', 'class', 'journey', 'pie', 'timeline', 'mindmap'])
const configNumber = /^\d{1,4}$/
const literalPlaceholder = /<([^<>\r\n]+)>/gu
const namedPlaceholder = /^(?:net|label|product-domain)$/i
const htmlElements = new Set('a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd legend li link main map mark math menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup svg table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'.split(' '))
// A numeric character reference is text that follows other text; a colour declaration follows its
// property, so `fill:#0c4a6e;` is an ordinary statement rather than an entity.
const unsafe = /%%\s*\{|^\s*---|\\|!\[|\]\s*\(|(?:^|[^:&])#\w+;|&(?:#|lt|gt|amp|quot|apos|[a-z]\w*;)|(?:https?|data|javascript|vbscript):|\/\/|\burl\s*\(|@\{|\$\$|@import|expression\s*\(/im
const disabled = /[<&]|\b(?:click|href|links?|style|classDef|linkStyle|css)\b/i
const message = 'Preview uses plain Mermaid only. Flowcharts support quoted comparisons, fan-out and bounded class and node colors, widths and dashes, and sequence diagrams support bidirectional messages. A leading front matter block may carry a title and a bounded diagram configuration of switches and whole numbers. Configuration directives, other HTML, entities, links, arbitrary CSS, images and math are disabled.'
function refuse(): never {
  throw new Error(message)
}

function inertPlaceholder(body: string) {
  if (!/^[\p{L}\p{N}_(). -]+$/u.test(body))
    return false
  if (namedPlaceholder.test(body))
    return true
  if (htmlElements.has(body.toLowerCase()) || body.includes('-'))
    return false
  return /[\p{Script=Han}\p{Lu}\p{N}()]/u.test(body)
}

// Mermaid renders these bounded placeholders as text with HTML labels disabled. Masking them only
// affects the policy scan; the original source is still what Mermaid receives.
function maskLiteralPlaceholders(text: string) {
  return text.replace(literalPlaceholder, (placeholder, body: string) => inertPlaceholder(body) ? ' '.repeat(placeholder.length) : placeholder)
}

// classDef and style carry the same declarations, so both take the same bounded properties.
function fileLink(statement: string): [string, string] | undefined {
  const match = linkStatement.exec(statement)
  const target = match?.[2]
  if (!match || !target || target.length > 200 || !linkFile.test(target))
    return undefined
  const segments = target.split('/')
  if (segments.some(segment => !linkSegment.test(segment) || segment === '.' || segment === '..'))
    return undefined
  return [match[1]!, target]
}

// The nodes a validated source links to, for the workspace to open; other sources link to nothing.
export function fileLinks(source: string): Map<string, string> {
  const links = new Map<string, string>()
  try {
    validateSource(source)
  }
  catch { return links }
  const plain = source.replace(frontMatter, '')
  if (!flowchartHeader.test(plain))
    return links
  mapFlowchart(plain, (statement) => {
    const link = fileLink(statement.trim())
    if (link)
      links.set(link[0], link[1])
    return statement
  })
  return links
}

// Mermaid positions linked nodes on anchor wrappers that our sanitizers must remove.
// Render ordinary nodes instead; the original draft still supplies application-owned targets.
export function renderSource(source: string): string {
  validateSource(source)
  const plain = source.replace(frontMatter, '')
  if (classHeader.test(plain))
    return source.slice(0, source.length - plain.length) + mapClassNotes(plain, note => note.replace(/\\n/g, '<br/>'))
  if (!flowchartHeader.test(plain))
    return source
  return source.slice(0, source.length - plain.length) + mapFlowchart(plain, statement => fileLink(statement.trim()) ? statement.replace(/[^\r\n]/g, ' ') : statement)
}

function validateDeclarations(statement: string, shape: RegExp) {
  const match = shape.exec(statement)
  if (!match)
    refuse()
  for (const declaration of match[1]!.split(',')) {
    const parts = declaration.trim().split(':')
    if (parts.length !== 2)
      refuse()
    const property = parts[0]!.trim()
    const value = parts[1]!.trim()
    switch (property) {
      case 'fill':
      case 'stroke':
      case 'color':
        if (!colors.test(value))
          refuse()
        break
      case 'stroke-width':
        if (!pixelNumber.test(value) || Number.parseFloat(value) <= 0 || Number.parseFloat(value) > 10)
          refuse()
        break
      case 'stroke-dasharray': {
        const lengths = value.split(/[ \t]+/)
        if (lengths.length > 8 || !lengths.every(part => pixelNumber.test(part)) || !lengths.some(part => Number.parseFloat(part) > 0))
          refuse()
        break
      }
      default: refuse()
    }
  }
}

// Validation, extraction and render projection share the same quote/comment boundaries.
function mapFlowchart(source: string, visit: (statement: string) => string) {
  let statement = ''
  let mapped = ''
  let quoted = false
  const finish = () => {
    mapped += visit(statement)
    statement = ''
  }
  for (let index = 0; index < source.length; index++) {
    const character = source[index]!
    if (!quoted && source.startsWith('%%', index)) {
      finish()
      const end = source.indexOf('\n', index)
      // Preserve comment bytes, including unmatched quotes; validation still checks their contents.
      mapped += source.slice(index, end === -1 ? source.length : end + 1)
      index = end === -1 ? source.length : end
    }
    else if (!quoted && /[;\r\n]/.test(character)) {
      finish()
      mapped += character
    }
    else {
      if (character === '"')
        quoted = !quoted
      statement += character
    }
  }
  finish()
  return mapped
}

// Plain node/group labels render as SVG text. Mask only address tokens for the resource check;
// markup, entities, scripts and CSS remain visible to validation, and draft/render bytes are intact.
function maskAddresses(text: string) {
  return text.replace(/https?:\/\/|\/\//gi, token => ' '.repeat(token.length))
}

function maskLabelAddresses(source: string) {
  return mapFlowchart(source, (statement) => {
    if (/^\s*(?:click|classDef|class|style|linkStyle)\b/i.test(statement))
      return statement
    return statement.replace(/\[\s*"[^"]*"\s*\]|\(\s*"[^"]*"\s*\)|\{\s*"[^"]*"\s*\}/g, label => label.includes('`') ? label : maskAddresses(label))
  })
}

function mapClassNotes(source: string, visit: (note: string) => string) {
  return source.replace(/^[ \t]*note(?:[ \t]+for[ \t]+[\w-]+)?[ \t]+"[^"\r\n]*"[ \t]*$/gim, visit)
}

function maskDisplayText(source: string) {
  // Whole-line citations are inert; directive-shaped comments keep every original check.
  const comments = source.replace(/^[ \t]*%%(?![ \t]*\{)[^\r\n]*/gm, maskAddresses)
  if (flowchartHeader.test(comments))
    return maskLabelAddresses(comments)
  if (sequenceHeader.test(comments))
    return comments.replace(/^[ \t]*note[ \t]+(?:over|left[ \t]+of|right[ \t]+of)[ \t]+[\w-]+(?:[ \t]*,[ \t]*[\w-]+)?[ \t]*:[^\r\n]*/gim, note => note.includes('`') ? note : maskAddresses(note))
  if (classHeader.test(comments))
    return mapClassNotes(comments, note => note.includes('`') ? note : note.replace(/\\n/g, '  '))
  return comments
}

function maskFlowchart(source: string) {
  const masked = mapFlowchart(source, (statement) => {
    const text = statement.trim()
    if (/^classDef\b/.test(text)) {
      validateDeclarations(text, definition)
      return ' '
    }
    else if (/^style\b/.test(text)) {
      validateDeclarations(text, styling)
      return ' '
    }
    else if (/^class\b/.test(text)) {
      if (!assignment.test(text))
        refuse()
      return ' '
    }
    else if (/^click\b/i.test(text)) {
      if (!fileLink(text))
        refuse()
      return ' '
    }
    else {
      return statement.replace(/"[^"]*"/g, (label) => {
        // Numeric or spaced comparisons are text; tag-shaped and incomplete HTML stay refused.
        const display = maskLiteralPlaceholders(label)
        if (/<\s*(?:[a-z][^<>]*>|[!/?])|<[a-z]/i.test(display))
          refuse()
        return display.replace(/\blink\b/gi, word => ' '.repeat(word.length)).replace(/([\p{L}\p{N}_)\]])([ \t]*)<(?==|[ \t]*[\d+-]|[ \t]+[\p{L}_])/gu, '$1$2 ')
      }).replace(inlineClass, ' ').replace(/<(?=--|==|-\.)/g, ' ')
    }
  })
  // Entities were rejected globally before fan-out is allowed; class syntax cannot escape validation.
  if (/\b(?:classDef|class|style|click)\b|:::/.test(masked))
    refuse()
  return maskLiteralPlaceholders(masked).replaceAll('&', ' ')
}

// Reads a front matter block, refusing anything outside the admitted shape, and returns its title
// for the ordinary label checks. A configuration reaches Mermaid through the same entry a directive
// uses, so the shape itself, not the host's own key filtering, is what keeps it harmless.
function frontMatterTitle(body: string) {
  let title: string | undefined
  let configured = false
  let section = ''
  let sectionIndent = 0
  for (const line of body.split(/\r?\n/)) {
    const entry = frontMatterEntry.exec(line)
    if (!entry)
      refuse()
    const [, indent, key, declared] = entry as unknown as [string, string, string, string]
    const value = declared.trim()
    if (!indent) {
      section = ''
      if (key === 'title' && title === undefined)
        title = value
      else if (key === 'config' && !configured && !value)
        configured = true
      else refuse()
    }
    else if (!configured) {
      refuse()
    }
    else if (!section || indent.length <= sectionIndent) {
      if (value || !configSections.has(key))
        refuse()
      section = key
      sectionIndent = indent.length
    }
    // htmlLabels is the one switch the host keeps for itself; every other leaf takes a switch or a
    // bounded whole number, so no leaf can carry a colour, a font, a selector or an address.
    else if (key === 'htmlLabels' || !(value === 'true' || value === 'false' || (configNumber.test(value) && Number(value) <= 1000))) {
      refuse()
    }
  }
  if (configured && !section)
    refuse()
  return title ?? ''
}

// These checks precede every context mask and Mermaid/CSS/measurement-host operation.
function unsupported(text: string) {
  return unsafe.test(text) || [...text].some(character => character.charCodeAt(0) < 32 && !'\t\r\n'.includes(character))
}

export function validateSource(source: string) {
  if (source.length > previewLimit)
    throw new Error('Live preview is limited to 32,000 characters. You can still edit and save this file.')
  const full = source.replace(bareLabelBreak, ' ')
  const block = frontMatter.exec(full)
  const plain = block ? full.slice(block[0].length) : full
  // The title is ordinary text and takes every check that a label takes.
  const title = block ? frontMatterTitle(block[1]!) : ''
  if (unsupported(title) || disabled.test(title))
    refuse()
  const flowchart = flowchartHeader.test(plain)
  if (unsupported(maskDisplayText(plain)))
    refuse()
  // Bidirectional messages are the only sequence arrows carrying an angle bracket, and the pair is
  // syntax rather than markup, so it is masked exactly like the flowchart arrows already are.
  const checked = flowchart
    ? maskFlowchart(plain)
    : sequenceHeader.test(plain) ? maskLiteralPlaceholders(plain).replace(/<<(?=--?>>)/g, '  ') : plain
  if (disabled.test(checked))
    refuse()
}
