import type { Content, Definition, FootnoteDefinition, FootnoteReference, Heading, ListItem, PhrasingContent, Root, Table, TableCell, TableRow } from 'mdast'
import type { DiagramBlock } from '../../../../src/shared/contracts'
import type { OpenFile } from '@/features/preview/file-links'
import GithubSlugger from 'github-slugger'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { frontmatter } from 'micromark-extension-frontmatter'
import { gfm } from 'micromark-extension-gfm'
import * as React from 'react'
import { annotateFileLinks, linkedFile } from '@/features/preview/file-links'
import { renderDiagram } from '@/features/preview/renderer'
import { fileLinks } from '@/features/preview/source-policy'
import { resolveProjectLink } from './document-links'

type RenderNode = Content | ListItem | TableRow | TableCell

const progressiveTextChunkBytes = 4096
const progressiveInitialChunks = 8
const progressiveChunksPerFrame = 8

function markDocumentStage(name: string) {
  performance.mark(`merdeck-markdown:${name}`)
}

function reportDocumentStage(name: string, detail: Record<string, unknown> = {}) {
  markDocumentStage(name)
  window.dispatchEvent(new CustomEvent('merdeck-markdown-stage', { detail: { name, at: performance.now(), ...detail } }))
}

function DocumentText({ value, source, range, deferred }: { value: string, source: string, range: { start: number, end: number } | null, deferred: boolean }) {
  const length = deferred && range ? range.end - range.start : value.length
  const chunks: { offset: number, value: string }[] = []
  let offset = deferred && range ? range.start : 0
  const limit = deferred && range ? range.end : value.length
  while (offset < limit) {
    let end = Math.min(limit, offset + progressiveTextChunkBytes)
    if (end < limit) {
      const boundary = (deferred ? source : value).lastIndexOf(' ', end)
      if (boundary > offset)
        end = boundary + 1
    }
    chunks.push({ offset, value: (deferred ? source : value).slice(offset, end) })
    offset = end
  }
  // A megabyte paragraph is expensive for Chromium to shape in one commit. Keep the
  // complete source in the response, but materialize bounded text runs over frames.
  const [visible, setVisible] = React.useState(() => Math.min(chunks.length, progressiveInitialChunks))
  React.useEffect(() => {
    let frame = 0
    const reveal = () => {
      setVisible((current) => {
        const next = Math.min(chunks.length, current + progressiveChunksPerFrame)
        if (next < chunks.length)
          frame = requestAnimationFrame(reveal)
        return next
      })
    }
    if (chunks.length > progressiveInitialChunks)
      frame = requestAnimationFrame(reveal)
    return () => cancelAnimationFrame(frame)
  }, [chunks.length])
  if (length <= progressiveTextChunkBytes)
    return value
  return chunks.slice(0, visible).map(chunk => <span key={chunk.offset} className="document-text-chunk">{chunk.value}</span>)
}

function phrasingText(nodes: readonly PhrasingContent[]): string {
  return nodes.map((node) => {
    if ('value' in node)
      return node.value
    if ('children' in node)
      return phrasingText(node.children)
    return ''
  }).join('')
}

function collectDocumentMetadata(root: Root | null) {
  const headings: Heading[] = []
  const definitions: Definition[] = []
  const footnotes: FootnoteDefinition[] = []
  const footnoteReferences: FootnoteReference[] = []
  const visit = (node: Root | RenderNode) => {
    if (node.type === 'heading')
      headings.push(node)
    else if (node.type === 'definition')
      definitions.push(node)
    else if (node.type === 'footnoteDefinition')
      footnotes.push(node)
    else if (node.type === 'footnoteReference')
      footnoteReferences.push(node)
    if ('children' in node)
      node.children.forEach(child => visit(child as RenderNode))
  }
  if (root)
    visit(root)
  return { definitions, footnotes, footnoteReferences, headings }
}

function FootnoteReferenceControl({ number, referenceMapRef, onNavigate }: { number: number, referenceMapRef: React.RefObject<Map<number, Set<HTMLElement>>>, onNavigate: () => void }) {
  const referenceRef = React.useRef<HTMLButtonElement>(null)
  React.useLayoutEffect(() => {
    const element = referenceRef.current
    if (!element)
      return
    const referenceMap = referenceMapRef.current
    const entries = referenceMap.get(number) ?? new Set<HTMLElement>()
    entries.add(element)
    referenceMap.set(number, entries)
    return () => {
      entries.delete(element)
      if (!entries.size)
        referenceMap.delete(number)
    }
  }, [number, referenceMapRef])
  return <button ref={referenceRef} type="button" aria-label={`Footnote ${number}`} onClick={onNavigate}>{number}</button>
}

function FootnoteDefinitionView({ number, definitionMapRef, children }: { number: number, definitionMapRef: React.RefObject<Map<number, HTMLElement>>, children: React.ReactNode }) {
  const definitionRef = React.useRef<HTMLElement>(null)
  React.useLayoutEffect(() => {
    const element = definitionRef.current
    if (!element)
      return
    const definitionMap = definitionMapRef.current
    definitionMap.set(number, element)
    return () => {
      if (definitionMap.get(number) === element)
        definitionMap.delete(number)
    }
  }, [definitionMapRef, number])
  return (
    <aside ref={definitionRef} aria-label={`Footnote ${number}`}>
      <sup>{number}</sup>
      {children}
    </aside>
  )
}

function isExternalLink(value: string): boolean {
  try {
    const url = new URL(value)
    const web = (url.protocol === 'http:' || url.protocol === 'https:') && /^https?:\/\/\S+$/i.test(value)
    const mail = url.protocol === 'mailto:' && /^mailto:\S+$/i.test(value)
    return web || mail
  }
  catch {
    return false
  }
}

function parse(text: string) {
  return fromMarkdown(text, { extensions: [gfm(), frontmatter(['yaml'])], mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])] })
}

function useDocumentTree(text: string) {
  const [state, setState] = React.useState<{ text: string, tree: Root | null, error: string | null }>({ text, tree: null, error: null })
  React.useEffect(() => {
    let worker: Worker
    let current = true
    let settled = false
    const id = 1
    const fallback = (error: unknown) => {
      if (!current || settled)
        return
      settled = true
      worker?.terminate()
      reportDocumentStage('worker-fallback', { error: 1 })
      queueMicrotask(() => {
        if (!current)
          return
        try {
          setState({ text, tree: parse(text), error: null })
        }
        catch {
          setState({ text, tree: null, error: error instanceof Error ? error.message : 'Markdown parsing failed.' })
        }
      })
    }
    try {
      if (typeof Worker === 'undefined')
        throw new Error('Worker unavailable')
      worker = new Worker(new URL('./markdown-worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<{ id: number, tree?: Root, error?: string, timing?: { parseMs: number, compactMs: number } }>) => {
        if (!current || settled || event.data.id !== id)
          return
        if (event.data.tree) {
          settled = true
          worker.terminate()
          reportDocumentStage('worker-message', event.data.timing)
          setState({ text, tree: event.data.tree, error: null })
        }
        else {
          fallback(new Error(event.data.error ?? 'Markdown parsing failed.'))
        }
      }
      worker.onerror = (event) => {
        reportDocumentStage('worker-runtime-error', { message: event.message })
        fallback(event)
      }
      reportDocumentStage('worker-post')
      worker.postMessage({ id, text })
    }
    catch (error) {
      fallback(error)
    }
    return () => {
      current = false
      worker?.terminate()
    }
  }, [text])
  return state.text === text ? state : { text, tree: null, error: null }
}

function InlineDiagram({ index, source, selected, themeRevision, onSelect, onOpenFile, onLinkError, onMount }: { index: number, source: string, selected: boolean, themeRevision: number, onSelect: () => void, onOpenFile?: OpenFile | undefined, onLinkError: (message: string) => void, onMount: (element: HTMLElement | null) => void }) {
  const figureRef = React.useRef<HTMLElement>(null)
  const graphicRef = React.useRef<HTMLDivElement>(null)
  const sourceRef = React.useRef(source)
  const linkRequestRef = React.useRef(0)
  const [activated, setActivated] = React.useState(false)
  const [lastValid, setLastValid] = React.useState<{ source: string, svg: string } | null>(null)
  const [failure, setFailure] = React.useState<{ source: string, message: string } | null>(null)
  const links = React.useMemo(() => fileLinks(source), [source])
  const wantsRender = selected || activated
  React.useEffect(() => {
    sourceRef.current = source
  }, [source])
  React.useEffect(() => {
    if (wantsRender)
      return
    const target = figureRef.current
    if (!target)
      return
    if (typeof IntersectionObserver === 'undefined') {
      let current = true
      queueMicrotask(() => {
        if (current)
          setActivated(true)
      })
      return () => {
        current = false
      }
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect()
        setActivated(true)
      }
    }, { rootMargin: '240px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [wantsRender])
  React.useEffect(() => {
    let current = true
    if (!wantsRender)
      return () => { current = false }
    void renderDiagram(source, () => current).then((svg) => {
      if (current && svg) {
        setLastValid({ source, svg })
        setFailure(null)
      }
    }, (error) => {
      if (current)
        setFailure({ source, message: error instanceof Error ? error.message : 'Unable to render diagram.' })
    })
    return () => {
      current = false
    }
  }, [source, themeRevision, wantsRender])
  const currentFailure = failure?.source === source ? failure.message : ''
  const stale = !!lastValid && lastValid.source !== source && selected
  const svg = lastValid && (lastValid.source === source || stale) ? lastValid.svg : ''
  const interactive = !!svg && !stale && !currentFailure
  React.useLayoutEffect(() => {
    annotateFileLinks(graphicRef.current?.querySelector('svg') ?? null, links, interactive)
  }, [interactive, links, svg])
  const followLink = (target: EventTarget) => {
    const file = linkedFile(target, graphicRef.current, onOpenFile)
    if (!file)
      return false
    const request = ++linkRequestRef.current
    const show = (message: string | undefined) => {
      if (sourceRef.current === source && linkRequestRef.current === request)
        onLinkError(message ?? '')
    }
    const result = onOpenFile?.(file)
    if (result instanceof Promise) {
      onLinkError('')
      void result.then(show, () => show('That file cannot be opened. Try again.'))
    }
    else {
      show(result)
    }
    return true
  }
  return (
    <figure
      ref={(element) => {
        figureRef.current = element
        onMount(element)
      }}
      className={`document-diagram${selected ? ' selected' : ''}`}
      onClick={(event) => {
        if (!followLink(event.target))
          onSelect()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ')
          return
        if (followLink(event.target))
          event.preventDefault()
      }}
    >
      <button
        type="button"
        className="document-diagram-select"
        aria-pressed={selected}
        aria-label={`Select Diagram ${index + 1}`}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
      >
        {selected ? 'Selected' : 'Select'}
      </button>
      {svg ? <div ref={graphicRef} className="diagram-graphic" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {currentFailure && <figcaption role="alert">{stale ? `Showing the last valid diagram. ${currentFailure}` : currentFailure}</figcaption>}
      {!svg && !currentFailure && <figcaption>{wantsRender ? 'Rendering diagram…' : 'Diagram renders when nearby.'}</figcaption>}
    </figure>
  )
}

export function DocumentView({ text, path, blocks, sources, selected, onSelect, onOpenFile, onOpenDiagramFile }: { text: string, path: string, blocks: DiagramBlock[], sources: string[], selected: number, onSelect: (index: number) => void, onOpenFile: OpenFile, onOpenDiagramFile?: OpenFile }) {
  const parsed = useDocumentTree(text)
  const [linkError, setLinkError] = React.useState('')
  const [themeRevision, setThemeRevision] = React.useState(0)
  const articleRef = React.useRef<HTMLElement>(null)
  const diagramMapRef = React.useRef(new Map<number, HTMLElement>())
  const revealedRef = React.useRef<{ path: string, selected: number } | null>(null)
  const documentLinkRequestRef = React.useRef(0)
  React.useLayoutEffect(() => {
    if (parsed.tree)
      reportDocumentStage('react-commit')
  }, [parsed.tree])
  React.useEffect(() => {
    if (!parsed.tree)
      return
    const frame = requestAnimationFrame(() => reportDocumentStage('layout-frame'))
    return () => cancelAnimationFrame(frame)
  }, [parsed.tree])
  React.useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision(value => value + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  React.useEffect(() => {
    if (!parsed.tree)
      return
    const previous = revealedRef.current
    if (previous?.path === path && previous.selected === selected)
      return
    const newPath = !previous || previous.path !== path
    const diagram = diagramMapRef.current.get(selected)
    if (newPath && selected <= 0) {
      const article = articleRef.current
      if (article) {
        if (typeof article.scrollTo === 'function')
          article.scrollTo({ top: 0 })
        else
          article.scrollTop = 0
      }
    }
    else if (diagram && 'scrollIntoView' in diagram) {
      diagram.scrollIntoView({ block: 'nearest' })
    }
    else {
      return
    }
    revealedRef.current = { path, selected }
  }, [path, parsed.tree, selected])
  const followDocumentLink = React.useCallback((target: string) => {
    const request = ++documentLinkRequestRef.current
    const show = (message: string | undefined) => {
      if (documentLinkRequestRef.current === request)
        setLinkError(message ?? '')
    }
    const result = onOpenFile(target)
    if (result instanceof Promise) {
      setLinkError('')
      void result.then(show, () => show('That file cannot be opened. Try again.'))
    }
    else {
      show(result)
    }
  }, [onOpenFile])
  const tree = parsed.tree
  const metadata = React.useMemo(() => collectDocumentMetadata(tree), [tree])
  const matched = React.useMemo(() => new Map(blocks.map((block, index) => [`${block.lineStart - 1}:${block.lineEnd + 1}`, index])), [blocks])
  const definitions = React.useMemo(() => {
    const entries = new Map<string, Definition>()
    for (const definition of metadata.definitions) {
      if (!entries.has(definition.identifier))
        entries.set(definition.identifier, definition)
    }
    return entries
  }, [metadata])
  const footnoteDefinitions = React.useMemo(() => {
    const entries = new Map<string, FootnoteDefinition>()
    for (const definition of metadata.footnotes) {
      if (!entries.has(definition.identifier))
        entries.set(definition.identifier, definition)
    }
    return entries
  }, [metadata])
  const footnotes = React.useMemo(() => {
    const entries = new Map<string, number>()
    for (const reference of metadata.footnoteReferences) {
      if (footnoteDefinitions.has(reference.identifier) && !entries.has(reference.identifier))
        entries.set(reference.identifier, entries.size + 1)
    }
    return entries
  }, [footnoteDefinitions, metadata])
  const headingSlugs = React.useMemo(() => {
    const slugger = new GithubSlugger()
    return new Map(metadata.headings.map(node => [node, slugger.slug(phrasingText(node.children))]))
  }, [metadata])
  const placementOk = blocks.every(block => tree?.children.some(node => node.type === 'code' && node.lang === 'mermaid' && node.position && `${node.position.start.line}:${node.position.end.line}` === `${block.lineStart - 1}:${block.lineEnd + 1}`))
  const image = (alt: string | null | undefined, url: string | undefined, key: string) => (
    <span key={key} className="document-image">
      Image:
      {alt || 'image'}
      {' '}
      (
      {url || 'unavailable'}
      )
    </span>
  )
  const followFragment = (url: string) => {
    if (!url.startsWith('#') || url.length === 1)
      return null
    try {
      const slug = decodeURIComponent(url.slice(1))
      return [...headingSlugs.values()].includes(slug) ? slug : null
    }
    catch {
      return null
    }
  }
  const headingMapRef = React.useRef(new Map<string, HTMLElement>())
  const footnoteMapRef = React.useRef(new Map<number, HTMLElement>())
  const footnoteReferenceMapRef = React.useRef(new Map<number, Set<HTMLElement>>())
  const resource = (url: string, children: React.ReactNode, key: string): React.ReactNode => {
    const fragment = followFragment(url)
    if (fragment)
      return <button key={key} type="button" className="document-link" onClick={() => headingMapRef.current.get(fragment)?.scrollIntoView({ block: 'nearest' })}>{children}</button>
    const project = resolveProjectLink(path, url)
    if (project)
      return <button key={key} type="button" className="document-link" onClick={() => followDocumentLink(project)}>{children}</button>
    if (isExternalLink(url))
      return <a key={key} href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>
    return <React.Fragment key={key}>{children}</React.Fragment>
  }
  // eslint-disable-next-line ts/no-use-before-define -- The renderer and its child recursion are intentionally paired.
  const renderChildren = (children: readonly RenderNode[] | readonly PhrasingContent[] | undefined): React.ReactNode => children?.map((node, index) => render(node, `${node.type}-${index}`))
  const renderTable = (table: Table, key: string) => {
    const row = (item: TableRow, header: boolean, rowKey: string) => (
      <tr key={rowKey}>
        {item.children.map((cell, index) => {
          const cellKey = cell.position?.start.offset ?? `${rowKey}-${cell.position?.start.column ?? index}`
          const alignment = table.align?.[index]
          return header
            ? <th key={cellKey} scope="col" style={alignment ? { textAlign: alignment } : undefined}>{renderChildren(cell.children)}</th>
            : <td key={cellKey} style={alignment ? { textAlign: alignment } : undefined}>{renderChildren(cell.children)}</td>
        })}
      </tr>
    )
    const [header, ...body] = table.children
    return (
      <table key={key}>
        {header && <thead>{row(header, true, 'header')}</thead>}
        <tbody>{body.map((item, index) => row(item, false, String(item.position?.start.offset ?? `body-${index}`)))}</tbody>
      </table>
    )
  }
  const render = (node: RenderNode, key: string): React.ReactNode => {
    const children = 'children' in node ? renderChildren(node.children as readonly RenderNode[]) : undefined
    if (node.type === 'text') {
      const deferred = !!(node.data && typeof node.data === 'object' && (node.data as Record<string, unknown>).merdeckDeferredText === true)
      const range = node.position?.start.offset !== undefined && node.position.end.offset !== undefined ? { start: node.position.start.offset, end: node.position.end.offset } : null
      return <DocumentText key={`${range?.start ?? key}:${range?.end ?? key}:${deferred}`} value={node.value} source={text} range={range} deferred={deferred} />
    }
    if (node.type === 'inlineCode')
      return <code key={key}>{node.value}</code>
    if (node.type === 'html') {
      const literal = node.value.replace(/<!--[\s\S]*?-->/g, '')
      return literal || null
    }
    if (node.type === 'paragraph')
      return <p key={key}>{children}</p>
    if (node.type === 'heading') {
      return React.createElement(`h${Math.min(6, node.depth)}`, { key, ref: (element: HTMLElement | null) => {
        const slug = headingSlugs.get(node)
        if (slug && element)
          headingMapRef.current.set(slug, element)
        else if (slug)
          headingMapRef.current.delete(slug)
      } }, children)
    }
    if (node.type === 'emphasis')
      return <em key={key}>{children}</em>
    if (node.type === 'strong')
      return <strong key={key}>{children}</strong>
    if (node.type === 'delete')
      return <del key={key}>{children}</del>
    if (node.type === 'blockquote')
      return <blockquote key={key}>{children}</blockquote>
    if (node.type === 'thematicBreak')
      return <hr key={key} />
    if (node.type === 'break')
      return <br key={key} />
    if (node.type === 'list')
      return node.ordered ? <ol key={key} start={node.start ?? undefined}>{children}</ol> : <ul key={key}>{children}</ul>
    if (node.type === 'listItem') {
      return (
        <li key={key}>
          {node.checked !== null && node.checked !== undefined && <input type="checkbox" checked={node.checked} readOnly tabIndex={-1} aria-label={node.checked ? 'Completed task' : 'Incomplete task'} />}
          {children}
        </li>
      )
    }
    if (node.type === 'image')
      return image(node.alt, node.url, key)
    if (node.type === 'imageReference')
      return image(node.alt, definitions.get(node.identifier)?.url, key)
    if (node.type === 'link') {
      return resource(node.url, children, key)
    }
    if (node.type === 'linkReference')
      return definitions.has(node.identifier) ? resource(definitions.get(node.identifier)!.url, children, key) : <React.Fragment key={key}>{children}</React.Fragment>
    if (node.type === 'footnoteReference') {
      const number = footnotes.get(node.identifier)
      return number
        ? (
            <sup key={key}>
              <FootnoteReferenceControl number={number} referenceMapRef={footnoteReferenceMapRef} onNavigate={() => footnoteMapRef.current.get(number)?.scrollIntoView({ block: 'nearest' })} />
            </sup>
          )
        : null
    }
    if (node.type === 'code') {
      const found = node.position ? matched.get(`${node.position.start.line}:${node.position.end.line}`) : undefined
      if (placementOk && node.lang === 'mermaid' && found !== undefined) {
        return (
          <InlineDiagram
            key={key}
            index={found}
            source={sources[found] ?? blocks[found]!.source}
            selected={selected === found}
            themeRevision={themeRevision}
            onSelect={() => onSelect(found)}
            onOpenFile={onOpenDiagramFile}
            onLinkError={setLinkError}
            onMount={(element) => {
              if (element)
                diagramMapRef.current.set(found, element)
              else
                diagramMapRef.current.delete(found)
            }}
          />
        )
      }
      return <pre key={key}><code>{node.value}</code></pre>
    }
    if (node.type === 'table')
      return renderTable(node, key)
    if (node.type === 'definition')
      return null
    if (node.type === 'footnoteDefinition') {
      const number = footnotes.get(node.identifier)
      return number
        ? (
            <FootnoteDefinitionView key={key} number={number} definitionMapRef={footnoteMapRef}>
              {children}
              <button type="button" aria-label={`Back to footnote ${number}`} onClick={() => [...(footnoteReferenceMapRef.current.get(number) ?? [])].find(element => element.isConnected)?.scrollIntoView({ block: 'nearest' })}>Back</button>
            </FootnoteDefinitionView>
          )
        : null
    }
    return <React.Fragment key={key}>{children}</React.Fragment>
  }
  if (parsed.error)
    return <article className="document-view" aria-label="Markdown document"><p role="alert">{parsed.error}</p></article>
  if (!parsed.tree)
    return <article className="document-view" aria-label="Markdown document"><p role="status">Loading document…</p></article>
  return (
    <article ref={articleRef} className="document-view" aria-label="Markdown document">
      {linkError && <p role="alert">{linkError}</p>}
      {!placementOk && <p className="document-mismatch" role="alert">Diagram placement could not be verified; Mermaid fences are shown as code.</p>}
      {parsed.tree.children.map((node, index) => render(node, `root-${index}`))}
    </article>
  )
}
