export const previewLimit = 32000
export const bareLabelBreak = /<br(?: ?\/)?>/gi
export const flowchartHeader = /^\s*(?:%%[^\n]*\n\s*)*(?:flowchart|graph)\b/
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
// A leading front matter block may carry a title and nothing else; `config` there is the same
// configuration surface as a directive and stays refused with every other key.
const frontMatterTitle = /^---\r?\n[ \t]*title:([^\n\r]*)\r?\n---(?:\r?\n|$)/
// A numeric character reference is text that follows other text; a colour declaration follows its
// property, so `fill:#0c4a6e;` is an ordinary statement rather than an entity.
const unsafe = /%%\s*\{|^\s*---|\\|!\[|\]\s*\(|(?:^|[^:&])#\w+;|&(?:#|lt|gt|amp|quot|apos|[a-z]\w*;)|(?:https?|data|javascript|vbscript):|\/\/|url\s*\(|@\{|\$\$|@import|expression\s*\(/im
const disabled = /[<&]|\b(?:click|href|links?|style|classDef|linkStyle|css)\b/i
const message = 'Preview uses plain Mermaid only. Flowcharts support quoted comparisons, fan-out and bounded class and node colors, widths and dashes. Configuration, other HTML, entities, links, arbitrary CSS, images and math are disabled.'
function refuse(): never {
  throw new Error(message)
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
  const plain = source.replace(bareLabelBreak, ' ')
  if (!flowchartHeader.test(plain))
    return links
  for (const statement of plain.split(/[\n;]/)) {
    const link = fileLink(statement.trim())
    if (link)
      links.set(link[0], link[1])
  }
  return links
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

// Split only at syntax boundaries, never inside a quoted label or line comment.
function maskFlowchart(source: string) {
  let statement = ''
  let masked = ''
  let quoted = false
  const finish = () => {
    const text = statement.trim()
    if (/^classDef\b/.test(text)) {
      validateDeclarations(text, definition)
      masked += ' '
    }
    else if (/^style\b/.test(text)) {
      validateDeclarations(text, styling)
      masked += ' '
    }
    else if (/^class\b/.test(text)) {
      if (!assignment.test(text))
        refuse()
      masked += ' '
    }
    else if (/^click\b/i.test(text)) {
      if (!fileLink(text))
        refuse()
      masked += ' '
    }
    else {
      masked += statement.replace(/"[^"]*"/g, (label) => {
        // Numeric or spaced comparisons are text; tag-shaped and incomplete HTML stay refused.
        if (/<\s*(?:[a-z][^<>]*>|[!/?])|<[a-z]/i.test(label))
          refuse()
        return label.replace(/([\p{L}\p{N}_)\]])([ \t]*)<(?==|[ \t]*[\d+-]|[ \t]+[\p{L}_])/gu, '$1$2 ')
      }).replace(inlineClass, ' ').replace(/<(?=--|==|-\.)/g, ' ')
    }
    statement = ''
  }
  for (let index = 0; index < source.length; index++) {
    const character = source[index]!
    if (!quoted && source.startsWith('%%', index)) {
      finish()
      const end = source.indexOf('\n', index)
      // Keep comment tails subject to global checks; do not assume upstream discards inline comments.
      masked += `${source.slice(index, end === -1 ? source.length : end)}\n`
      index = end === -1 ? source.length : end
    }
    else if (!quoted && /[;\r\n]/.test(character)) {
      finish()
      masked += character
    }
    else {
      if (character === '"')
        quoted = !quoted
      statement += character
    }
  }
  finish()
  // Entities were rejected globally before fan-out is allowed; class syntax cannot escape validation.
  if (/\b(?:classDef|class|style|click)\b|:::/.test(masked))
    refuse()
  return masked.replaceAll('&', ' ')
}

// These checks precede every context mask and Mermaid/CSS/measurement-host operation.
function unsupported(text: string) {
  return unsafe.test(text) || [...text].some(character => character.charCodeAt(0) < 32 && !'\t\r\n'.includes(character))
}

export function validateSource(source: string) {
  if (source.length > previewLimit)
    throw new Error('Live preview is limited to 32,000 characters. You can still edit and save this file.')
  const full = source.replace(bareLabelBreak, ' ')
  const titled = frontMatterTitle.exec(full)
  const plain = titled ? full.slice(titled[0].length) : full
  // The title is ordinary text and takes every check that a label takes.
  if (titled && (unsupported(titled[1]!) || disabled.test(titled[1]!)))
    refuse()
  if (unsupported(plain))
    refuse()
  const flowchart = flowchartHeader.test(plain)
  const checked = flowchart ? maskFlowchart(plain) : plain
  if (disabled.test(checked))
    refuse()
}
