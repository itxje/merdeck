import type { DefaultTreeAdapterTypes } from 'parse5'
import { parse } from 'parse5'
import { deferredTextBytes, textChunks } from './markdown-text'

export type HtmlElementTag
  = | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'p' | 'br' | 'hr' | 'blockquote' | 'pre' | 'code'
    | 'em' | 'strong' | 'del' | 'ul' | 'ol' | 'li'
    | 'dl' | 'dt' | 'dd' | 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr' | 'th' | 'td' | 'caption'
    | 'mark' | 'sub' | 'sup' | 'time' | 'abbr' | 'kbd' | 'samp' | 'var' | 'q' | 'cite' | 'small' | 'a'
    | 'nav' | 'main' | 'aside' | 'section' | 'article' | 'header' | 'footer' | 'div' | 'span'
    | 'img' | 'picture' | 'audio' | 'video' | 'source' | 'track' | 'style'

export type HtmlRenderNode
  = | { type: 'text', value: string, chunks?: string[] }
    | { type: 'placeholder', kind: 'image' | 'media', label: string }
    | {
      type: 'element'
      tag: HtmlElementTag
      children: HtmlRenderNode[]
      href?: string
      src?: string
      alt?: string
      title?: string
      width?: string
      height?: string
      style?: Record<string, string>
      sourceId?: string
      sourceType?: string
    }

export interface HtmlProjection {
  children: HtmlRenderNode[]
  truncated: boolean
  stats: { visitedNodes: number, textCharacters: number }
}

interface HtmlProjectionLimits {
  maxDepth: number
  maxNodes: number
  maxTextCharacters: number
  maxUrlCharacters: number
}

const defaultLimits: HtmlProjectionLimits = {
  maxDepth: 64,
  maxNodes: 4000,
  maxTextCharacters: 1024 * 1024,
  maxUrlCharacters: 2048,
}

const htmlNamespace = 'http://www.w3.org/1999/xhtml'
const dropped = new Set(['base', 'canvas', 'embed', 'frame', 'frameset', 'iframe', 'link', 'meta', 'noembed', 'noframes', 'noscript', 'object', 'script', 'template'])
const childlessControls = new Set(['input'])
const mapped = new Map<string, HtmlElementTag>([
  ['b', 'strong'],
  ['i', 'em'],
  ['s', 'del'],
  ['strike', 'del'],
])
const allowed = new Set<HtmlElementTag>([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'blockquote',
  'pre',
  'code',
  'em',
  'strong',
  'del',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'mark',
  'sub',
  'sup',
  'time',
  'abbr',
  'kbd',
  'samp',
  'var',
  'q',
  'cite',
  'small',
  'a',
  'nav',
  'main',
  'aside',
  'section',
  'article',
  'header',
  'footer',
  'div',
  'span',
  'img',
  'picture',
  'audio',
  'video',
  'source',
  'track',
  'style',
])

export function isHtmlElementTag(value: unknown): value is HtmlElementTag {
  return typeof value === 'string' && allowed.has(value as HtmlElementTag)
}

function attribute(node: DefaultTreeAdapterTypes.Element, name: string): string | undefined {
  return node.attrs.find(item => item.name === name && item.namespace === undefined)?.value
}

function safeHref(value: string | undefined, max: number): string | undefined {
  // eslint-disable-next-line no-control-regex -- URLs containing controls never become capabilities.
  if (!value || value.length > max || /[\u0000-\u001F\u007F]/.test(value))
    return undefined
  if (value.startsWith('#') && value.length > 1)
    return value
  try {
    const url = new URL(value)
    if (((url.protocol === 'http:' || url.protocol === 'https:') && /^https?:\/\/\S+$/i.test(value)) || (url.protocol === 'mailto:' && /^mailto:\S+$/i.test(value)))
      return value
  }
  catch { /* A project-relative target is checked below. */ }
  return /^(?:[^:/?#]+\/)*[^/?#]+\.(?:md|mmd|mermaid|html|htm)(?:#.*)?$/i.test(value) ? value : undefined
}

function safeMediaSrc(value: string | undefined, max: number): string | undefined {
  // eslint-disable-next-line no-control-regex -- URLs containing controls never become capabilities.
  if (!value || value.length > max || /[\u0000-\u001F\u007F]/.test(value))
    return undefined
  const trimmed = value.trim()
  if (/^javascript:/i.test(trimmed) || /^vbscript:/i.test(trimmed))
    return undefined
  if (/^data:(?:image|audio|video)\/[a-z0-9.+-]+;base64,/i.test(trimmed))
    return trimmed
  try {
    const url = new URL(trimmed)
    if ((url.protocol === 'http:' || url.protocol === 'https:') && /^https?:\/\/\S+$/i.test(trimmed))
      return trimmed
  }
  catch {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed))
      return trimmed
  }
  return undefined
}

function safeSourceId(value: string | undefined): string | undefined {
  // eslint-disable-next-line no-control-regex -- Source identifiers containing controls stay unmounted.
  return value && value.length <= 256 && !/[\u0000-\u001F\u007F]/.test(value) ? value : undefined
}

function parseSafeStyle(raw: string | undefined): Record<string, string> | undefined {
  // eslint-disable-next-line no-control-regex -- Style containing control characters is rejected.
  if (!raw || typeof raw !== 'string' || raw.length > 4096 || /[\u0000-\u001F\u007F]|expression\(|javascript:|behavior:/i.test(raw))
    return undefined
  const style: Record<string, string> = {}
  const declarations = raw.split(';')
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':')
    if (colonIndex === -1)
      continue
    const prop = decl.slice(0, colonIndex).trim().toLowerCase()
    const value = decl.slice(colonIndex + 1).trim()
    if (!/^[a-z][a-z0-9-]*$/.test(prop) || !value || value.length > 512)
      continue
    if (/javascript|expression|behavior/i.test(prop) || /javascript:|expression\(|behavior:/i.test(value))
      continue
    const camelProp = prop.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
    style[camelProp] = value
  }
  return Object.keys(style).length > 0 ? style : undefined
}

function scopeCss(raw: string): string {
  // eslint-disable-next-line no-control-regex -- Style containing control characters is rejected.
  if (raw.length > 65536 || /[\u0000-\u001F\u007F]|expression\(|javascript:|behavior:/i.test(raw))
    return ''
  const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import\s[^;]+;?/gi, '')
  return clean.replace(/([^{}]+)\{([^}]+)\}/g, (match, selector, rules) => {
    const trimmed = selector.trim()
    if (trimmed.startsWith('@'))
      return match
    const scopedSelectors = trimmed.split(',').map((part: string) => {
      const p = part.trim()
      if (p === 'body' || p === 'html' || p === ':root')
        return '.html-document-view'
      if (p.startsWith('.html-document-view'))
        return p
      return `.html-document-view ${p}`
    }).join(', ')
    return `${scopedSelectors} {${rules}}`
  }).trim()
}

function findTag(node: DefaultTreeAdapterTypes.ParentNode, tagName: string): DefaultTreeAdapterTypes.Element | undefined {
  const queue: DefaultTreeAdapterTypes.ChildNode[] = [...node.childNodes]
  while (queue.length) {
    const child = queue.shift()!
    if ('tagName' in child) {
      if (child.namespaceURI === htmlNamespace && child.tagName === tagName)
        return child
      queue.push(...child.childNodes)
    }
  }
  return undefined
}

export function projectHtml(source: string, overrides: Partial<HtmlProjectionLimits> = {}): HtmlProjection {
  const limits = { ...defaultLimits, ...overrides }
  const document = parse(source)
  let truncated = false
  let visitedNodes = 0
  let textCharacters = 0

  const text = (value: string): HtmlRenderNode[] => {
    if (!value || textCharacters >= limits.maxTextCharacters) {
      if (value)
        truncated = true
      return []
    }
    let bounded = value.slice(0, limits.maxTextCharacters - textCharacters)
    if (bounded.length < value.length) {
      truncated = true
      if (/[\uD800-\uDBFF]/.test(bounded.at(-1) ?? ''))
        bounded = bounded.slice(0, -1)
    }
    textCharacters += bounded.length
    if (!bounded)
      return []
    const chunks = bounded.length > deferredTextBytes ? textChunks(bounded) : undefined
    return [{ type: 'text', value: chunks ? '' : bounded, ...(chunks ? { chunks } : {}) }]
  }

  const visit = (node: DefaultTreeAdapterTypes.ChildNode, depth: number): HtmlRenderNode[] => {
    if (visitedNodes >= limits.maxNodes || depth > limits.maxDepth) {
      truncated = true
      return []
    }
    visitedNodes++
    if (node.nodeName === '#text' && 'value' in node)
      return text(node.value)
    if (!('tagName' in node) || node.namespaceURI !== htmlNamespace)
      return []
    const sourceTag = node.tagName.toLowerCase()
    if (dropped.has(sourceTag) || node.namespaceURI !== htmlNamespace)
      return []
    if (sourceTag === 'style') {
      const css = node.childNodes
        .filter(c => c.nodeName === '#text' && 'value' in c)
        .map(c => (c as { value: string }).value)
        .join('')
      const scoped = scopeCss(css)
      return scoped ? [{ type: 'element', tag: 'style', children: [{ type: 'text', value: scoped }] }] : []
    }
    if (sourceTag === 'img') {
      const src = safeMediaSrc(attribute(node, 'src'), limits.maxUrlCharacters)
      const alt = attribute(node, 'alt')?.slice(0, 256)
      const title = attribute(node, 'title')?.slice(0, 256)
      const width = attribute(node, 'width')?.slice(0, 32)
      const height = attribute(node, 'height')?.slice(0, 32)
      const style = parseSafeStyle(attribute(node, 'style'))
      const sourceId = safeSourceId(attribute(node, 'id'))
      return [{
        type: 'element',
        tag: 'img',
        children: [],
        ...(src ? { src } : {}),
        ...(alt !== undefined ? { alt } : {}),
        ...(title ? { title } : {}),
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        ...(style ? { style } : {}),
        ...(sourceId ? { sourceId } : {}),
      }]
    }
    if (childlessControls.has(sourceTag))
      return []
    const children = node.childNodes.flatMap(child => visit(child, depth + 1))
    const tag = mapped.get(sourceTag) ?? (allowed.has(sourceTag as HtmlElementTag) ? sourceTag as HtmlElementTag : undefined)
    if (!tag)
      return children
    const href = tag === 'a' ? safeHref(attribute(node, 'href'), limits.maxUrlCharacters) : undefined
    const src = (tag === 'audio' || tag === 'video' || tag === 'source' || tag === 'track')
      ? safeMediaSrc(attribute(node, 'src'), limits.maxUrlCharacters)
      : undefined
    const sourceType = tag === 'source' ? attribute(node, 'type')?.slice(0, 64) : undefined
    const sourceId = safeSourceId(attribute(node, 'id'))
    const style = parseSafeStyle(attribute(node, 'style'))
    return [{
      type: 'element',
      tag,
      children,
      ...(href ? { href } : {}),
      ...(src ? { src } : {}),
      ...(sourceType ? { sourceType } : {}),
      ...(style ? { style } : {}),
      ...(sourceId ? { sourceId } : {}),
    }]
  }

  const head = findTag(document, 'head')
  const body = findTag(document, 'body')
  const headStyles = head ? head.childNodes.filter(n => 'tagName' in n && n.tagName.toLowerCase() === 'style').flatMap(node => visit(node, 0)) : []
  const bodyChildren = body ? body.childNodes.flatMap(node => visit(node, 0)) : []
  const children = [...headStyles, ...bodyChildren]
  return { children, truncated, stats: { visitedNodes, textCharacters } }
}
