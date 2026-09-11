// Buffer complete lines so a secret split across pipe chunks cannot escape redaction.
export async function redactedOutput(stream: ReadableStream<Uint8Array>, secrets: readonly string[], write: (text: string) => void) {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let pending = ''
  const emit = (text: string) => {
    for (const secret of secrets) {
      if (secret)
        text = text.replaceAll(secret, '<redacted>')
    }
    write(text)
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true })
      if (pending.length > 2 * 1024 * 1024)
        throw new Error('A verification output line exceeded its safe bound')
      const last = pending.lastIndexOf('\n')
      if (last >= 0) {
        emit(pending.slice(0, last + 1))
        pending = pending.slice(last + 1)
      }
      if (done)
        break
    }
    emit(pending)
  }
  finally { reader.releaseLock() }
}
