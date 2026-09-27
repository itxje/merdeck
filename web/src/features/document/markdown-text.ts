export const deferredTextBytes = 4096

export function textChunks(value: string): string[] {
  const chunks: string[] = []
  for (let start = 0; start < value.length;) {
    let end = Math.min(value.length, start + deferredTextBytes)
    // Never split a Unicode surrogate pair across independent React text nodes.
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1]!) && /[\uDC00-\uDFFF]/.test(value[end]!))
      end--
    chunks.push(value.slice(start, end))
    start = end
  }
  return chunks
}
