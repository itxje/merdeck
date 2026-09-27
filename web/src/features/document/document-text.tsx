import * as React from 'react'
import { deferredTextBytes } from './markdown-text'

const progressiveInitialChunks = 8
const progressiveChunksPerFrame = 8
const chunkIdentities = new WeakMap<string[], number>()
let nextChunkIdentity = 0

function ProgressiveDocumentText({ runs }: { runs: string[] }) {
  const length = runs.reduce((total, run) => total + run.length, 0)
  // Large text runs are expensive for Chromium to shape in one commit. Materialize
  // bounded runs over animation frames while retaining the complete source response.
  const [visible, setVisible] = React.useState(() => Math.min(runs.length, progressiveInitialChunks))
  React.useEffect(() => {
    let frame = 0
    const reveal = () => {
      setVisible((current) => {
        const next = Math.min(runs.length, current + progressiveChunksPerFrame)
        if (next < runs.length)
          frame = requestAnimationFrame(reveal)
        return next
      })
    }
    if (runs.length > progressiveInitialChunks)
      frame = requestAnimationFrame(reveal)
    return () => cancelAnimationFrame(frame)
  }, [runs.length])
  if (length <= deferredTextBytes)
    return runs.join('')
  let offset = 0
  return runs.slice(0, visible).map((run, index) => {
    const key = offset
    offset += run.length
    return <span key={key} className="document-text-chunk" data-document-text-complete={visible === runs.length && index === runs.length - 1 ? '' : undefined}>{run}</span>
  })
}

export function DocumentText({ value, chunks }: { value: string, chunks: string[] | null }) {
  if (!chunks)
    return value
  let identity = chunkIdentities.get(chunks)
  if (identity === undefined) {
    identity = ++nextChunkIdentity
    chunkIdentities.set(chunks, identity)
  }
  return <ProgressiveDocumentText key={identity} runs={chunks} />
}
