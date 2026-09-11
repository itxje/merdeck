function completeCalls(trace: string) {
  const pending = new Map<string, { syscall: string, start: string }>()
  const lines: string[] = []
  let pairedCalls = 0
  for (const line of trace.split('\n').filter(line => line.trim())) {
    const record = /^(?:\s*(\d+)|\[pid\s+(\d+)\])\s+(\S.*)$/.exec(line)
    if (!record)
      throw new Error('Trace record is missing a process/thread identity')
    const identity = record[1] ?? record[2]!
    const body = record[3]!
    const resumed = /^<\.\.\. ([a-z_][a-z0-9_]*) resumed>(.*)$/.exec(body)
    const previous = pending.get(identity)
    if (resumed) {
      if (!previous || previous.syscall !== resumed[1])
        throw new Error('Trace has an unmatched or mismatched resumed syscall')
      lines.push(`${identity} ${previous.start}${resumed[2]}`)
      pending.delete(identity)
      pairedCalls++
      continue
    }
    const syscall = /^([a-z_][a-z0-9_]*)\(/.exec(body)?.[1]
    if (syscall && previous)
      throw new Error('Trace has concurrent syscalls for the same process/thread identity')
    if (body.endsWith(' <unfinished ...>')) {
      if (!syscall)
        throw new Error('Trace has a malformed unfinished syscall')
      pending.set(identity, { syscall, start: body.slice(0, -' <unfinished ...>'.length) })
    }
    else {
      if (body.startsWith('<...') || (syscall && !/\)\s+=\s+/.test(body)))
        throw new Error('Trace has a malformed or incomplete syscall')
      lines.push(line)
    }
  }
  if (pending.size)
    throw new Error('Trace has unfinished syscalls without matching returns')
  return { lines, pairedCalls }
}

export function auditTrace(trace: string, executable: string, checkout: string, directory: string, root: string) {
  // strace interleaves threads between syscall entry and return; audit only complete evidence.
  const { lines, pairedCalls } = completeCalls(trace)
  const relevant = lines.filter(line => /\b(?:execve|execveat|listen|open|openat|openat2|stat|statx|newfstatat|readlink|readlinkat|access)\(/.test(line))
  if (relevant.some(line => !/\)\s+=\s+-?\d+(?:<[^>]+>+)?(?:\s.*)?$/.test(line)))
    throw new Error('Trace has a relevant syscall without a complete numeric return')
  const execution = lines.filter(line => /\bexecve(?:at)?\(/.test(line) && line.endsWith('= 0'))
  if (execution.length !== 1 || !execution[0]!.includes(`"${executable}"`))
    throw new Error('Trace does not prove a single executable without a child runtime')
  if (!lines.some(line => /\blisten\(/.test(line) && line.endsWith('= 0')))
    throw new Error('Trace is missing actual listener evidence')
  const access = lines.filter(line => /\b(?:open|openat|openat2|stat|statx|newfstatat|readlink|readlinkat|access)\(/.test(line))
  if (access.some(line => (line.includes(checkout) && !line.includes(root)) || /web\/dist|node_modules/.test(line)))
    throw new Error('Executable accessed source checkout or separate frontend/runtime resources')
  const creations = access.filter(line => /O_(?:CREAT|WRONLY|RDWR)/.test(line) && !/\)\s+=\s+-\d+\b/.test(line))
  // AT_FDCWD annotations describe cwd even for absolute paths; only the returned fd identifies the opened file.
  for (const line of creations) {
    const target = /=\s+\d+<([^>]+)>$/.exec(line)?.[1]
    if (!target || !(target.startsWith(`${root}/`) || target.startsWith('/dev/') || target.startsWith('/memfd:')))
      throw new Error('Unexpected executable disk write outside the configured synthetic project')
    if (target === directory || target.startsWith(`${directory}/`))
      throw new Error('Executable extracted resources into its runtime directory')
  }
  return { executions: execution.length, pairedCalls, fileAccesses: access.length, writes: creations.length, checkoutAccesses: 0, runtimePath: 'empty', frontendExtraction: false }
}
