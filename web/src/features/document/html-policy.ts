import type { DefaultTreeAdapterTypes } from 'parse5'
import { parse } from 'parse5'
import { deferredTextBytes, textChunks } from './markdown-text'

export type HtmlElementTag
  = | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'p' | 'br' | 'hr' | 'blockquote' | 'pre' | 'code'
    | 'em' | 'strong' | 'del' | 'ul' | 'ol' | 'li'
    | 'dl' | 'dt' | 'dd' | 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr' | 'th' | 'td' | 'caption'
    | 'mark' | 'sub' | 'sup' | 'time' | 'abbr' | 'kbd' | 'samp' | 'var' | 'q' | 'cite' | 'small' | 'a'

export type HtmlRenderNode
  = | { type: 'text', value: string, chunks?: string[] }
    | { type: 'placeholder', kind: 'image' | 'media', label: string }
    | { type: 'element', tag: HtmlElementTag, children: HtmlRenderNode[], href?: string, sourceId?: string }

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
const dropped = new Set(['base', 'canvas', 'embed', 'frame', 'frameset', 'iframe', 'link', 'meta', 'noembed', 'noframes', 'noscript', 'object', 'script', 'style', 'template'])
const images = new Set(['img', 'picture'])
const media = new Set(['audio', 'video', 'source', 'track'])
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

function safeSourceId(value: string | undefined): string | undefined {
  // eslint-disable-next-line no-control-regex -- Source identifiers containing controls stay unmounted.
  return value && value.length <= 256 && !/[\u0000-\u001F\u007F]/.test(value) ? value : undefined
}

function bodyOf(document: DefaultTreeAdapterTypes.Document): DefaultTreeAdapterTypes.Element | undefined {
  const queue: DefaultTreeAdapterTypes.ChildNode[] = [...document.childNodes]
  while (queue.length) {
    const node = queue.shift()!
    if ('tagName' in node) {
      if (node.namespaceURI === htmlNamespace && node.tagName === 'body')
        return node
      queue.push(...node.childNodes)
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
    if (images.has(sourceTag)) {
      const label = sourceTag === 'img' ? (attribute(node, 'alt')?.slice(0, 256) || 'image') : 'image'
      return [{ type: 'placeholder', kind: 'image', label }]
    }
    if (media.has(sourceTag))
      return [{ type: 'placeholder', kind: 'media', label: 'media' }]
    if (childlessControls.has(sourceTag))
      return []
    const children = node.childNodes.flatMap(child => visit(child, depth + 1))
    const tag = mapped.get(sourceTag) ?? (allowed.has(sourceTag as HtmlElementTag) ? sourceTag as HtmlElementTag : undefined)
    if (!tag)
      return children
    const href = tag === 'a' ? safeHref(attribute(node, 'href'), limits.maxUrlCharacters) : undefined
    const sourceId = safeSourceId(attribute(node, 'id'))
    return [{ type: 'element', tag, children, ...(href ? { href } : {}), ...(sourceId ? { sourceId } : {}) }]
  }

  const body = bodyOf(document)
  const children = body ? body.childNodes.flatMap(node => visit(node, 0)) : []
  return { children, truncated, stats: { visitedNodes, textCharacters } }
}
