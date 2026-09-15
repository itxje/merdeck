import type { DiagramBlock } from '../../../../src/shared/contracts'
import type { OpenFile } from '@/features/preview/file-links'
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

interface Node { type: string, value?: string, lang?: string | null, url?: string, alt?: string | null, depth?: number, checked?: boolean | null, ordered?: boolean, align?: (string | null)[], children?: Node[], position?: { start: { line: number }, end: { line: number } } }

function parse(text: string) {
  return fromMarkdown(text, { extensions: [gfm(), frontmatter(['yaml'])], mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(['yaml'])] }) as unknown as { children: Node[] }
}

function useDocumentTree(text: string) {
  const [state, setState] = React.useState<{ text: string, tree: { children: Node[] } | null, error: string | null }>({ text, tree: null, error: null })
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
      worker.onmessage = (event: MessageEvent<{ id: number, tree?: { children: Node[] }, error?: string }>) => {
        if (!current || settled || event.data.id !== id)
          return
        if (event.data.tree) {
          settled = true
          worker.terminate()
          setState({ text, tree: event.data.tree, error: null })
        }
        else {
          fallback(new Error(event.data.error ?? 'Markdown parsing failed.'))
        }
      }
      worker.onerror = fallback
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
  const tree = parsed.tree ?? { children: [] }
  const matched = React.useMemo(() => new Map(blocks.map((block, index) => [`${block.lineStart - 1}:${block.lineEnd + 1}`, index])), [blocks])
  const placementOk = blocks.every(block => tree.children.some(node => node.type === 'code' && node.lang === 'mermaid' && node.position && `${node.position.start.line}:${node.position.end.line}` === `${block.lineStart - 1}:${block.lineEnd + 1}`))
  // eslint-disable-next-line ts/no-use-before-define -- The renderer and its child recursion are intentionally paired.
  const renderChildren = (children: Node[] | undefined): React.ReactNode => children?.map((node, index) => render(node, `${node.type}-${index}`))
  const render = (node: Node, key: string): React.ReactNode => {
    const children = renderChildren(node.children)
    if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'html')
      return node.value
    if (node.type === 'paragraph')
      return <p key={key}>{children}</p>
    if (node.type === 'heading')
      return React.createElement(`h${Math.min(6, node.depth ?? 1)}`, { key }, children)
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
      return node.ordered ? <ol key={key}>{children}</ol> : <ul key={key}>{children}</ul>
    if (node.type === 'listItem') {
      return (
        <li key={key}>
          {node.checked !== null && node.checked !== undefined && <input type="checkbox" checked={node.checked} readOnly tabIndex={-1} />}
          {children}
        </li>
      )
    }
    if (node.type === 'image') {
      return (
        <span key={key} className="document-image">
          Image:
          {node.alt || 'image'}
          {' '}
          (
          {node.url}
          )
        </span>
      )
    }
    if (node.type === 'link') {
      const project = node.url ? resolveProjectLink(path, node.url) : null
      if (project) {
        return (
          <button
            key={key}
            type="button"
            className="document-link"
            onClick={() => followDocumentLink(project)}
          >
            {children}
          </button>
        )
      }
      if (node.url && /^(?:https?:|mailto:)/i.test(node.url))
        return <a key={key} href={node.url} target="_blank" rel="noopener noreferrer">{children}</a>
      return <React.Fragment key={key}>{children}</React.Fragment>
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
      return <table key={key}><tbody>{children}</tbody></table>
    if (node.type === 'tableRow')
      return <tr key={key}>{children}</tr>
    if (node.type === 'tableCell')
      return <td key={key}>{children}</td>
    if (node.type === 'footnoteDefinition')
      return <aside key={key}>{children}</aside>
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
      {tree.children.map((node, index) => render(node, `root-${index}`))}
    </article>
  )
}
