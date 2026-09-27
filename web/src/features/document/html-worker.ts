import { projectHtml } from './html-policy'

globalThis.onmessage = (event: MessageEvent<{ id: number, text: string }>) => {
  const { id, text } = event.data
  try {
    const started = performance.now()
    const projection = projectHtml(text)
    globalThis.postMessage({ id, projection, timing: { projectMs: performance.now() - started } })
  }
  catch (error) {
    globalThis.postMessage({ id, error: error instanceof Error ? error.message : 'HTML preview failed.' })
  }
}
