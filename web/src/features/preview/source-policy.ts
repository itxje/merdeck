export const previewLimit = 100000
export const bareLabelBreak = /<br(?: ?\/)?>/gi
export const flowchartHeader = /^\s*(?:%%[^\n]*\n\s*)*(?:flowchart|graph)\b/
const sequenceHeader = /^\s*(?:%%[^\n]*\n\s*)*sequenceDiagram\b/
const classHeader = /^\s*(?:%%[^\n]*\n\s*)*classDiagram\b/
// Families whose `class` statement assigns a style class; in a class diagram it declares a class.
const assignmentHeader = /^\s*(?:%%[^\n]*\n\s*)*(?:flowchart|graph|stateDiagram|erDiagram|block-beta|block|requirementDiagram)\b/
const identifier = '[a-z_][\\w-]*'
const identifiers = `${identifier}(?:,${identifier})*`
const definition = new RegExp(`^classDef[ \\t]+${identifiers}[ \\t]+(\\S.*)$`, 'i')
const styling = new RegExp(`^style[ \\t]+${identifiers}[ \\t]+(\\S.*)$`, 'i')
const assignment = new RegExp(`^class[ \\t]+${identifiers}[ \\t]+${identifier}$`, 'i')
const cssAssignment = new RegExp(`^cssClass[ \\t]+"${identifier}(?:[ \\t]*,[ \\t]*${identifier})*"[ \\t]+${identifier}$`, 'i')
const inlineClass = new RegExp(`:::${identifier}(?=[ \\t;[\\]{}()&]|$)`, 'gi')
// A click may only name a diagram file inside this project; callbacks, addresses and every other
// form stay refused, and following one is the application's navigation, never a rendered link.
const linkStatement = new RegExp(`^click[ \\t]+(${identifier})[ \\t]+"([^"]*)"$`, 'i')
const linkFile = /\.(?:mmd|mermaid|md)$/i
const linkSegment = /^[\w.-]+$/
const pixelNumber = /^(?:\d{1,2}(?:\.\d{1,2})?|100)(?:px)?$/
const sizeNumber = /^(\d{1,3}(?:\.\d{1,2})?)(px|pt|em|rem|%)?$/
const fraction = /^(?:[01](?:\.0{1,3})?|0?\.\d{1,3})$/
const hexColor = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i
const namedColors = new Set('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent currentcolor none'.split(' '))
// A leading front matter block may carry a title and a bounded configuration, in either order and
// at most once each. `config` there is the same surface as a configuration directive, so it admits
// only a diagram section holding switches and bounded whole numbers: no value may carry text, and
// no key that spells CSS, a font, a theme, a layout or an address can be expressed at all.
const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const frontMatterEntry = /^([ \t]*)([a-z][\w-]*):(.*)$/i
const configSections = new Set(['flowchart', 'sequence', 'gantt', 'state', 'er', 'class', 'journey', 'pie', 'timeline', 'mindmap'])
const configNumber = /^\d{1,4}$/
const namedPlaceholder = /^(?:net|label|product-domain)$/i
const encodedAnglePlaceholder = /&lt;([a-z][a-z0-9_]{0,63})&gt;/g
const markupElements = new Set('a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd legend li link main map mark math menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup svg table tbody td template textarea tfoot th thead time title tr track u ul var video wbr animate animatemotion animatetransform feimage filter foreignobject image set use'.split(' '))
// The preview's security boundary: configuration directives, entities and Mermaid escape codes,
// resource references, script schemes, shape metadata and math. A numeric character reference is
// text that follows other text; a colour declaration follows its property, so `fill:#0c4a6e;` is
// an ordinary statement rather than an entity.
const boundary = /%%\s*\{|&(?:#|lt|gt|amp|quot|apos|[a-z]\w*;)|(?:^|[^:&])#\w+;|!\[|\]\s*\(|\burl\s*\(|image-set\s*\(|@import|expression\s*\(|(?:javascript|vbscript):|@\{|\$\$/im
const secondBlock = /^\s*---/m
const c4Reference = /\$\w*(?:link|sprite)\w*\s*=/i
// Statements whose values reach raw CSS or attributes, where a backslash can spell `url(`.
const rawStyle = /^(?:todayMarker|box|rect|Update\w*)\b|\$\w+\s*=|\]\s*(?:radius|color|stroke-color|stroke-width)\s*:/i
const message = 'Preview uses plain Mermaid only. Configuration directives, links and callbacks, HTML tags, entity codes, resource references, shape metadata, math and styles outside the bounded declarations are disabled.'
function refuse(): never {
  throw new Error(message)
}

// A placeholder such as `<Node>` is text unless its first word is an element or custom element.
function inertPlaceholder(body: string) {
  if (!/^[\p{L}\p{N}_(). ,-]+$/u.test(body))
    return false
  if (namedPlaceholder.test(body))
    return true
  const name = body.split(/[ ,().]/)[0]!
  return !markupElements.has(name.toLowerCase()) && !name.includes('-')
}

function anglePlaceholderMarker(source: string, offset: number) {
  for (let attempt = 0; ; attempt++) {
    const marker = `\uE000merdeck-angle-${offset.toString(36)}-${attempt.toString(36)}\uE001`
    if (!source.includes(marker))
      return marker
  }
}

// This is a render-only escape hatch for a literal placeholder, not general entity decoding.
// The exact lowercase token grammar cannot carry whitespace, attributes, nesting or a custom
// element name, and the decoded form must still be an inert placeholder under the raw-markup rule.
function projectEncodedAnglePlaceholders(source: string, forMermaid = false) {
  return source.replace(encodedAnglePlaceholder, (token, body: string, offset: number) => {
    if (!inertPlaceholder(body))
      return token
    // Mermaid receives a private inert text marker, never a tag-shaped token. The renderer only
    // restores it in generated SVG text nodes after Mermaid has finished parsing.
    return forMermaid ? anglePlaceholderMarker(source, offset) : `<${body}>`
  })
}

// Restore only markers derived from accepted tokens in this exact source; text nodes cannot create
// SVG elements, attributes, resource loads or event handlers when their data changes.
export function restoreEncodedAnglePlaceholderText(svg: Element, source: string) {
  const replacements = [...source.matchAll(encodedAnglePlaceholder)].flatMap((match) => {
    const body = match[1]!
    return inertPlaceholder(body) && match.index !== undefined ? [[anglePlaceholderMarker(source, match.index), `<${body}>`] as const] : []
  })
  if (!replacements.length)
    return
  const walker = document.createTreeWalker(svg, NodeFilter.SHOW_TEXT)
  const labels = new Map<Element, { combined: string, nodes: { node: Text, start: number, end: number }[] }>()
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    const node = current as Text
    // Limit restoration to Mermaid's rendered label tree, never generated CSS or metadata.
    const label = node.parentElement?.closest('text')
    if (!label)
      continue
    const entry = labels.get(label) ?? { combined: '', nodes: [] }
    labels.set(label, entry)
    const start = entry.combined.length
    entry.combined += node.data
    if (node.data)
      entry.nodes.push({ node, start, end: entry.combined.length })
  }
  for (const { combined, nodes } of labels.values()) {
    for (const marker of replacements.flatMap(([value, replacement]) => {
      const offsets: number[] = []
      for (let offset = combined.indexOf(value); offset !== -1; offset = combined.indexOf(value, offset + value.length))
        offsets.push(offset)
      return offsets.map(offset => ({ value, replacement, start: offset, end: offset + value.length }))
    }).sort((first, second) => second.start - first.start)) {
      const first = nodes.findIndex(segment => segment.start <= marker.start && marker.start < segment.end)
      const last = nodes.findIndex(segment => segment.start < marker.end && marker.end <= segment.end)
      if (first === -1 || last === -1)
        continue
      const firstSegment = nodes[first]!
      const lastSegment = nodes[last]!
      const before = firstSegment.node.data.slice(0, marker.start - firstSegment.start)
      const after = lastSegment.node.data.slice(marker.end - lastSegment.start)
      firstSegment.node.data = before + marker.replacement
      for (let index = first + 1; index < last; index++)
        nodes[index]!.node.data = ''
      if (first !== last)
        lastSegment.node.data = after
      else
        firstSegment.node.data += after
    }
  }
}

// HTML opens a tag only where `<` is immediately followed by an ASCII letter, `/`, `!` or `?`;
// every other `<` is text to a conforming parser, and the render pipeline has no other kind.
function markup(text: string) {
  for (const match of text.matchAll(/<(?=[a-z!/?])/gi)) {
    const placeholder = /^<([a-z][^<>\r\n]*)>/i.exec(text.slice(match.index))
    if (!placeholder || !inertPlaceholder(placeholder[1]!))
      return true
  }
  return false
}

function unsafeText(text: string) {
  return boundary.test(text) || c4Reference.test(text) || markup(text) || [...text].some(character => character.charCodeAt(0) < 32 && !'\t\r\n'.includes(character))
}

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
  const projected = projectEncodedAnglePlaceholders(source, true)
  const plain = projected.replace(frontMatter, '')
  if (classHeader.test(plain))
    return projected.slice(0, projected.length - plain.length) + mapClassNotes(plain, note => note.replace(/\\n/g, '<br/>'))
  if (!flowchartHeader.test(plain))
    return projected
  return projected.slice(0, projected.length - plain.length) + mapFlowchart(plain, statement => fileLink(statement.trim()) ? statement.replace(/[^\r\n]/g, ' ') : statement)
}

function declaration(property: string, value: string) {
  switch (property) {
    case 'fill':
    case 'stroke':
    case 'color':
    case 'stroke-color':
      return hexColor.test(value) || namedColors.has(value.toLowerCase())
    case 'stroke-width':
      return pixelNumber.test(value) && Number.parseFloat(value) > 0 && Number.parseFloat(value) <= 10
    case 'stroke-dasharray': {
      const lengths = value.split(/[ \t]+/)
      return lengths.length <= 8 && lengths.every(part => pixelNumber.test(part)) && lengths.some(part => Number.parseFloat(part) > 0)
    }
    case 'font-weight':
      return /^(?:normal|bold|bolder|lighter|[1-9]00)$/i.test(value)
    case 'font-style':
      return /^(?:normal|italic|oblique)$/i.test(value)
    case 'font-size': {
      const size = sizeNumber.exec(value)
      const amount = Number.parseFloat(size?.[1] ?? '0')
      const limit = size?.[2] === 'em' || size?.[2] === 'rem' ? 10 : size?.[2] === '%' ? 1000 : 100
      return !!size && amount > 0 && amount <= limit
    }
    case 'opacity':
    case 'fill-opacity':
    case 'stroke-opacity':
      return fraction.test(value) || (/^\d{1,3}%$/.test(value) && Number.parseInt(value, 10) <= 100)
    case 'rx':
    case 'ry':
    case 'radius':
      return pixelNumber.test(value)
    default:
      return false
  }
}

// classDef and style carry the same declarations in every family, so both take the same bounded properties.
function validateDeclarations(statement: string, shape: RegExp) {
  const match = shape.exec(statement)
  if (!match)
    refuse()
  for (const item of match[1]!.split(',')) {
    const parts = item.trim().split(':')
    if (parts.length !== 2 || !declaration(parts[0]!.trim().toLowerCase(), parts[1]!.trim()))
      refuse()
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

function mapClassNotes(source: string, visit: (note: string) => string) {
  return source.replace(/^[ \t]*note(?:[ \t]+for[ \t]+[\w-]+)?[ \t]+"[^"\r\n]*"[ \t]*$/gim, visit)
}

interface Family { flowchart: boolean, sequence: boolean, classes: boolean, assigns: boolean }

function checkStatement(text: string, family: Family, comment: boolean) {
  if (/^click\b/i.test(text)) {
    // Only a statement is projected and extracted as a link, so a link inside a comment stays refused.
    if (comment || !family.flowchart || !fileLink(text))
      refuse()
  }
  else if (/^linkStyle\b/i.test(text) || (family.sequence && /^(?:links?|properties|details)\b/i.test(text)) || (family.classes && /^(?:callback|link)\b/i.test(text))) {
    refuse()
  }
  else if (/^classDef\b/i.test(text)) {
    validateDeclarations(text, definition)
  }
  else if (/^style\b/i.test(text)) {
    validateDeclarations(text, styling)
  }
  else if (family.assigns && /^class\b/i.test(text) && !assignment.test(text)) {
    refuse()
  }
  else if (family.classes && /^cssClass\b/i.test(text) && !cssAssignment.test(text)) {
    refuse()
  }
}

// Statements are read by line and `;` without regard to quotes, so an unbalanced quote cannot hide one.
// A comment body is read as a statement too; nothing upstream is assumed to discard it.
function checkStatements(plain: string) {
  const family = { flowchart: flowchartHeader.test(plain), sequence: sequenceHeader.test(plain), classes: classHeader.test(plain), assigns: assignmentHeader.test(plain) }
  for (const line of plain.split(/\r?\n/)) {
    if (line.includes('\\') && rawStyle.test(line.trim()))
      refuse()
    // An inline class names an identifier; any other `:::` in a flowchart is refused.
    if (family.flowchart && line.replace(inlineClass, ' ').includes(':::'))
      refuse()
    // Everything after the first `%%` on a line is comment, including text after a `;`.
    const comment = line.indexOf('%%')
    for (const segment of (comment === -1 ? line : line.slice(0, comment)).split(';'))
      checkStatement(segment.trim(), family, false)
    if (comment !== -1) {
      for (const segment of line.slice(comment + 2).split(';'))
        checkStatement(segment.trim(), family, true)
    }
  }
}

// Reads a front matter block, refusing anything outside the admitted shape, and returns its title
// for the ordinary text checks. A configuration reaches Mermaid through the same entry a directive
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

export function validateSource(source: string) {
  if (source.length > previewLimit)
    throw new Error('Live preview is limited to 100,000 characters. You can still edit and save this file.')
  const full = projectEncodedAnglePlaceholders(source.replace(bareLabelBreak, ' '))
  const block = frontMatter.exec(full)
  const plain = block ? full.slice(block[0].length) : full
  if (block) {
    // YAML double-quoted scalars decode escapes, so a backslash could spell what the text check never sees.
    if (block[0].includes('\\') || unsafeText(frontMatterTitle(block[1]!)))
      refuse()
  }
  if (secondBlock.test(plain) || unsafeText(plain))
    refuse()
  checkStatements(plain)
}
