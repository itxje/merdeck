import { expect, test } from 'bun:test'
import { auditTrace } from '../../scripts/release/trace'

const baseline = '1 execve("/scratch/runtime/program", ["program"], 0x0 /* 12 vars */) = 0\n1 listen(4, 512) = 0\n1 openat(AT_FDCWD, "/proc/self/fd/4/file.mmd", O_RDONLY) = 5</fixture/file.mmd>\n'
const audit = (trace: string) => auditTrace(trace, '/scratch/runtime/program', '/checkout', '/scratch/runtime', '/fixture')
test('trace verification requires observed execution/listen and refuses source, runtimes or extraction', () => {
  expect(audit(baseline).executions).toBe(1)
  for (const addition of ['1 execve("/bin/bun", ["bun"], 0x0) = 0\n', '1 openat(AT_FDCWD, "/checkout/web/dist/index.html", O_RDONLY) = 6\n', '1 openat(AT_FDCWD, "/scratch/runtime/app.js", O_CREAT|O_WRONLY) = 6\n'])
    expect(() => audit(baseline + addition)).toThrow()
  expect(() => audit('')).toThrow()
})

test('strace cwd annotation cannot turn a descriptor-anchored project save into extraction', () => {
  const line = '1 openat(AT_FDCWD</scratch/runtime>, "/proc/self/fd/19/.temporary", O_WRONLY|O_CREAT, 0600) = 20</fixture/.temporary>\n'
  expect(audit(baseline + line).writes).toBe(1)
  expect(() => audit(baseline + line.replace('20</fixture/.temporary>', '20</scratch/runtime/app.js>'))).toThrow()
})

const interleaved = [
  '55035 openat(AT_FDCWD</scratch/runtime>, "/proc/self/fd/18/.temporary", O_WRONLY|O_CREAT|O_EXCL|O_LARGEFILE|O_NOFOLLOW, 0600 <unfinished ...>',
  '55193 statx(19</fixture>, "", AT_STATX_SYNC_AS_STAT|AT_EMPTY_PATH, STATX_ALL,  <unfinished ...>',
  '55035 <... openat resumed>)             = 20</fixture/.temporary>',
  '55193 <... statx resumed>{stx_mask=STATX_ALL|STATX_MNT_ID, stx_attributes=0, stx_mode=S_IFDIR|0700, stx_size=4096, ...}) = 0',
].join('\n')

test('observed interleaved openat and statx records preserve the scoped returned descriptor', () => {
  expect(audit(baseline + interleaved)).toMatchObject({ pairedCalls: 2, fileAccesses: 3, writes: 1 })
})

test('actual strace device annotations survive single-line and split read returns', () => {
  const single = '2 openat(AT_FDCWD</scratch/runtime>, "/dev/urandom", O_RDONLY) = 5</dev/urandom<char 1:9>>\n'
  const split = '3 openat(AT_FDCWD</scratch/runtime>, "/dev/urandom", O_RDONLY <unfinished ...>\n3 <... openat resumed>) = 6</dev/urandom<char 1:9>>\n'
  expect(audit(baseline + single + split)).toMatchObject({ pairedCalls: 1, fileAccesses: 3, writes: 0 })
})

test('split writes retain rejection of external destinations and runtime extraction', () => {
  for (const target of ['/outside/.temporary', '/scratch/runtime/app.js'])
    expect(() => audit(baseline + interleaved.replace('20</fixture/.temporary>', `20<${target}>`))).toThrow('Unexpected executable disk write')
  expect(() => auditTrace(baseline + interleaved.replace('20</fixture/.temporary>', '20</fixture/runtime/app.js>'), '/scratch/runtime/program', '/checkout', '/fixture/runtime', '/fixture')).toThrow('extracted resources')
})

test('completed negative-return split opens never count as successful writes', () => {
  for (const result of ['-1 EACCES (Permission denied)', '-2 ENOENT (No such file or directory)']) {
    const trace = interleaved.replace('20</fixture/.temporary>', result)
    expect(audit(baseline + trace)).toMatchObject({ pairedCalls: 2, fileAccesses: 3, writes: 0 })
  }
})

test('concurrent identities pair their own syscall and return, independent of completion order', () => {
  const trace = [
    '2 openat(AT_FDCWD, "/outside/denied", O_WRONLY|O_CREAT, 0600 <unfinished ...>',
    '[pid 3] openat(AT_FDCWD, "/fixture/saved", O_WRONLY|O_CREAT, 0600 <unfinished ...>',
    '4 readlinkat(AT_FDCWD, "/proc/self/fd/8",  <unfinished ...>',
    '[pid 3] <... openat resumed>) = 8</fixture/saved>',
    '4 <... readlinkat resumed>"/fixture/saved", 4096) = 14',
    '2 <... openat resumed>) = -1 EACCES (Permission denied)',
  ].join('\n')
  expect(audit(baseline + trace)).toMatchObject({ pairedCalls: 3, fileAccesses: 4, writes: 1 })
  expect(() => audit(baseline + trace.replace('8</fixture/saved>', '8</outside/saved>'))).toThrow('Unexpected executable disk write')
})

test('split source access and extra runtime execution remain visible to the audit', () => {
  for (const path of ['/checkout/src/index.ts', '/other/web/dist/index.html', '/other/node_modules/runtime.js']) {
    const trace = `2 openat(AT_FDCWD,  <unfinished ...>\n2 <... openat resumed>"${path}", O_RDONLY) = 8<${path}>\n`
    expect(() => audit(baseline + trace)).toThrow('accessed source checkout')
  }
  for (const syscall of ['execve', 'execveat']) {
    const trace = `2 ${syscall}(${syscall === 'execveat' ? 'AT_FDCWD, ' : ''}"/bin/bun",  <unfinished ...>\n2 <... ${syscall} resumed>["bun"], 0x0) = 0\n`
    expect(() => audit(baseline + trace)).toThrow('without a child runtime')
  }
  const trace = '1 execve("/scratch/runtime/program",  <unfinished ...>\n1 <... execve resumed>["program"], 0x0) = 0\n1 listen(4, 512 <unfinished ...>\n1 <... listen resumed>) = 0\n'
  expect(audit(trace)).toMatchObject({ pairedCalls: 2, executions: 1, writes: 0 })
})

test('unpaired, mismatched, ambiguous and malformed syscall evidence fails closed', () => {
  const start = '2 openat(AT_FDCWD, "/fixture/temp", O_WRONLY|O_CREAT, 0600 <unfinished ...>\n'
  const end = '2 <... openat resumed>) = 8</fixture/temp>\n'
  const malformed = [
    start,
    end,
    start + end.replace('2 <', '3 <'),
    start + end.replace('openat', 'statx'),
    start + start + end,
    `${start}2 statx(8, "", 0, 0, {}) = 0\n${end}`,
    start + end + end,
    `${start}2 <... openat resume>) = 8</fixture/temp>\n`,
    `${start}2 <... openat resumed>) =\n`,
    `${start}2 <... openat resumed>) = ?\n`,
    `2 <unfinished ...>\n${end}`,
    start.replace('2 ', '') + end,
    '2 openat(AT_FDCWD, "/fixture/temp", O_RDONLY)\n',
  ]
  for (const trace of malformed)
    expect(() => audit(baseline + trace)).toThrow(/Trace/)
})
