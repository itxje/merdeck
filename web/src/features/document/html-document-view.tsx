import type { HtmlProjection, HtmlRenderNode } from './html-policy'
import type { OpenFile } from '@/features/preview/file-links'
import * as React from 'react'
import { isExternalLink, resolveProjectLink } from './document-links'
import { DocumentReader } from './document-reader'
import { DocumentText } from './document-text'
import { isHtmlElementTag } from './html-policy'

function reportHtmlStage(name: string, detail: Record<string, unknown> = {}) {
  performance.mark(`merdeck-html:${name}`)
  window.dispatchEvent(new CustomEvent('merdeck-html-stage', { detail: { name, at: performance.now(), ...detail } }))
}

function useHtmlProjection(text: string) {
  const [state, setState] = React.useState<{ text: string, projection: HtmlProjection | null, error: string | null }>({ text, projection: null, error: null })
  React.useEffect(() => {
    let current = true
    let worker: Worker | undefined
    const fail = () => {
      if (!current)
        return
      worker?.terminate()
      queueMicrotask(() => {
        if (current)
          setState({ text, projection: null, error: 'The safe HTML preview is unavailable.' })
      })
    }
    try {
      if (typeof Worker === 'undefined')
        throw new Error('Worker unavailable')
      worker = new Worker(new URL('./html-worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<{ id?: unknown, projection?: HtmlProjection, error?: unknown, timing?: { projectMs?: number } }>) => {
        if (!current || event.data.id !== 1)
          return
        const projection = event.data.projection
        if (!projection || !Array.isArray(projection.children) || typeof projection.truncated !== 'boolean') {
          fail()
          return
        }
        worker?.terminate()
        reportHtmlStage('worker-message', event.data.timing)
        setState({ text, projection, error: null })
      }
      worker.onerror = fail
      reportHtmlStage('worker-post')
      worker.postMessage({ id: 1, text })
    }
    catch {
      fail()
    }
    return () => {
      current = false
      worker?.terminate()
    }
  }, [text])
  return state.text === text ? state : { text, projection: null, error: null }
}

function isRenderElement(candidate: unknown): candidate is HtmlRenderNode & { type: 'element' } {
  return !!candidate && typeof candidate === 'object' && (candidate as { type?: unknown }).type === 'element'
}

function sourceIds(nodes: HtmlRenderNode[]): Set<string> {
  const ids = new Set<string>()
  const visit = (node: HtmlRenderNode) => {
    if (node.type !== 'element')
      return
    if (node.sourceId)
      ids.add(node.sourceId)
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return ids
}

export function HtmlDocumentView({ text, path, onOpenFile }: { text: string, path: string, onOpenFile: OpenFile }) {
  const state = useHtmlProjection(text)
  const [linkError, setLinkError] = React.useState<{ path: string, message: string }>({ path, message: '' })
  const linkRequestRef = React.useRef({ path, request: 0 })
  const anchorsRef = React.useRef(new Map<string, HTMLElement>())
  React.useEffect(() => {
    linkRequestRef.current = { path, request: linkRequestRef.current.request + 1 }
    anchorsRef.current.clear()
  }, [path, text])
  React.useLayoutEffect(() => {
    if (state.projection)
      reportHtmlStage('react-commit')
  }, [state.projection])
  const knownIds = React.useMemo(() => sourceIds(state.projection?.children ?? []), [state.projection])
  const publishLinkError = React.useCallback((message: string) => {
    setLinkError(current => current.path === path && current.message === message ? current : { path, message })
  }, [path])
  const followProjectLink = React.useCallback((target: string) => {
    const request = linkRequestRef.current.request + 1
    linkRequestRef.current = { path, request }
    const show = (message: string | undefined) => {
      if (linkRequestRef.current.path === path && linkRequestRef.current.request === request)
        publishLinkError(message ?? '')
    }
    const result = onOpenFile(target)
    if (result instanceof Promise) {
      publishLinkError('')
      void result.then(show, () => show('That file cannot be opened. Try again.'))
    }
    else {
      show(result)
    }
  }, [onOpenFile, path, publishLinkError])
  const mountSourceId = (sourceId: string | undefined) => sourceId
    ? (element: HTMLElement | null) => {
        const existing = anchorsRef.current.get(sourceId)
        if (element && (!existing || !existing.isConnected))
          anchorsRef.current.set(sourceId, element)
        else if (!element && existing && !existing.isConnected)
          anchorsRef.current.delete(sourceId)
      }
    : undefined
  // The renderer accepts only the application-owned node vocabulary. A malformed
  // Worker message cannot choose a DOM tag or provide DOM attributes.
  const render = (candidate: unknown, key: string): React.ReactNode => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
      return null
    const node = candidate as Partial<HtmlRenderNode> & { children?: unknown }
    if (node.type === 'text') {
      if (typeof node.value !== 'string')
        return null
      const chunks = Array.isArray(node.chunks) && node.chunks.every(item => typeof item === 'string') ? node.chunks : null
      return <DocumentText key={key} value={node.value} chunks={chunks} />
    }
    if (node.type === 'placeholder') {
      if ((node.kind !== 'image' && node.kind !== 'media') || typeof node.label !== 'string')
        return null
      return (
        <span key={key} className="document-image">
          {node.kind === 'image' ? 'Image' : 'Media'}
          :
          {' '}
          {node.label}
        </span>
      )
    }
    if (node.type !== 'element' || !isHtmlElementTag(node.tag) || !Array.isArray(node.children))
      return null
    const id = typeof node.sourceId === 'string' ? node.sourceId : undefined
    const ref = mountSourceId(id)
    const style = node.style
    if (node.tag === 'img') {
      const src = typeof node.src === 'string' ? node.src : undefined
      const alt = typeof node.alt === 'string' ? node.alt : ''
      const title = typeof node.title === 'string' ? node.title : undefined
      const width = typeof node.width === 'string' ? node.width : undefined
      const height = typeof node.height === 'string' ? node.height : undefined
      return (
        <img
          key={key}
          id={id}
          ref={ref as React.Ref<HTMLImageElement>}
          src={src}
          alt={alt}
          title={title}
          width={width}
          height={height}
          style={style}
          loading="lazy"
        />
      )
    }
    if (node.tag === 'video' || node.tag === 'audio') {
      const src = typeof node.src === 'string' ? node.src : undefined
      const children = node.children.map((child, index) => render(child, `${key}-${index}`))
      return React.createElement(node.tag, { key, id, ref, controls: true, src, style }, children)
    }
    if (node.tag === 'source') {
      const src = typeof node.src === 'string' ? node.src : undefined
      const type = typeof node.sourceType === 'string' ? node.sourceType : undefined
      return <source key={key} id={id} src={src} type={type} />
    }
    if (node.tag === 'track') {
      const src = typeof node.src === 'string' ? node.src : undefined
      return <track key={key} id={id} src={src} />
    }
    if (node.tag === 'style') {
      const css = node.children
        .filter(c => typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text')
        .map(c => (c as { value: string }).value)
        .join('')
      return <style key={key}>{css}</style>
    }
    if (node.tag === 'hr' || node.tag === 'br')
      return React.createElement(node.tag, { key, id, ref, style })
    const children = node.children.map((child, index) => render(child, `${key}-${index}`))
    if (node.tag === 'table') {
      // A wide table scrolls inside its own frame and keeps its table role for assistive technology.
      return (
        <div key={key} className="html-document-table" role="region" aria-label="Scrollable table" tabIndex={0}>
          <table id={id} ref={ref as React.Ref<HTMLTableElement>} style={style}>{children}</table>
        </div>
      )
    }
    if (node.tag === 'a') {
      const href = typeof node.href === 'string' ? node.href : ''
      if (href.startsWith('#') && href.length > 1) {
        try {
          const fragment = decodeURIComponent(href.slice(1))
          if (knownIds.has(fragment))
            return <button key={key} id={id} ref={ref as React.Ref<HTMLButtonElement>} type="button" className="document-link" style={style} onClick={() => anchorsRef.current.get(fragment)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>{children}</button>
        }
        catch { /* Malformed fragments stay inert. */ }
      }
      const project = resolveProjectLink(path, href)
      if (project)
        return <button key={key} id={id} ref={ref as React.Ref<HTMLButtonElement>} type="button" className="document-link" style={style} onClick={() => followProjectLink(project)}>{children}</button>
      if (isExternalLink(href))
        return <a key={key} id={id} ref={ref as React.Ref<HTMLAnchorElement>} href={href} style={style} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}</a>
      return <span key={key} id={id} ref={ref} style={style}>{children}</span>
    }
    return React.createElement(node.tag, { key, id, ref, style }, children)
  }
  if (state.error) {
    return (
      <DocumentReader path={path}><article className="document-view html-document-view" aria-label="HTML document"><p role="alert">{state.error}</p></article></DocumentReader>
    )
  }
  if (!state.projection) {
    return (
      <DocumentReader path={path}><article className="document-view html-document-view" aria-label="HTML document"><p role="status">Loading document…</p></article></DocumentReader>
    )
  }
  const nodes = state.projection.children
  const sidebarIndex = nodes.findIndex(node => isRenderElement(node) && node.tag === 'nav')
  return (
    <DocumentReader path={path} contents={sidebarIndex >= 0 ? render(nodes[sidebarIndex], 'sidebar') : undefined}>
      <article className="document-view html-document-view" aria-label="HTML document">
        <div className="html-document-body">
          {linkError.path === path && linkError.message && <p role="alert">{linkError.message}</p>}
          {state.projection.truncated && <p className="document-mismatch" role="status">Preview truncated to stay within safe rendering limits.</p>}
          {nodes.map((node, index) => index === sidebarIndex ? null : render(node, `root-${index}`))}
        </div>
      </article>
    </DocumentReader>
  )
}
