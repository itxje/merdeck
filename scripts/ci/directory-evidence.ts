import { z } from 'zod'

const digest = z.string().regex(/^[a-f0-9]{64}$/)
const count = (maximum: number) => z.number().int().min(0).max(maximum)
const modeSchema = z.strictObject({
  mode: z.enum(['source', 'bundle', 'compiled']),
  status: z.enum(['pending', 'failed', 'passed']),
  buildHash: digest.nullable(),
  firstPages: z.array(z.strictObject({ fixture: z.enum(['small', 'huge']), calls: count(1024), capacity: z.literal(4096), returnedBytes: count(4096), rawRecords: count(170), eof: z.boolean() })).max(2),
  traversals: z.array(z.strictObject({ fixture: z.enum(['small', 'huge', 'excluded']), pages: count(40000), visited: count(32773), excluded: count(32773), entries: count(32771), complete: z.boolean() })).max(3),
  eintrCalls: count(1).nullable(),
  cancellation: z.strictObject({ calls: count(1), elapsedMs: z.number().min(0).max(180000) }).nullable(),
  audit: z.strictObject({ calls: count(8192), rawRecords: count(8362), consumed: count(8192), eof: z.boolean() }).nullable(),
}).superRefine((mode, context) => {
  if (mode.status !== 'passed')
    return
  const expected = [{ fixture: 'small', entries: 1003, excluded: 2 }, { fixture: 'huge', entries: 32771, excluded: 2 }, { fixture: 'excluded', entries: 0, excluded: 10005 }]
  if (!mode.buildHash || mode.firstPages.length !== 2 || mode.firstPages.some((page, index) => page.fixture !== ['small', 'huge'][index] || page.calls !== 1 || !page.returnedBytes || !page.rawRecords || page.eof)
    || mode.traversals.length !== 3 || mode.traversals.some((row, index) => row.fixture !== expected[index]!.fixture || row.entries !== expected[index]!.entries || row.excluded !== expected[index]!.excluded || row.visited !== row.entries + row.excluded || !row.complete || !row.pages)
    || mode.eintrCalls !== 1 || mode.cancellation?.calls !== 1 || mode.cancellation.elapsedMs < 100 || !mode.audit?.calls || !mode.audit.consumed || mode.audit.eof) {
    context.addIssue({ code: 'custom', message: 'Passing mode requires complete bounded physical proof' })
  }
})
export const directoryEvidenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  sourceClean: z.boolean(),
  adapterHash: digest,
  driverHash: digest,
  bun: z.literal('1.4.2'),
  architecture: z.enum(['arm64', 'x64']),
  filesystemType: z.string().regex(/^(?:unknown|0x[a-f0-9]{1,16})$/),
  status: z.enum(['passed', 'failed']),
  error: z.enum(['verification_failed', 'cleanup_failed']).nullable(),
  modes: z.array(modeSchema).length(3),
}).superRefine((report, context) => {
  if (report.modes.some((mode, index) => mode.mode !== ['source', 'bundle', 'compiled'][index])
    || (report.status === 'passed' && (report.error !== null || report.modes.some(mode => mode.status !== 'passed')))
    || (report.status === 'failed' && report.error === null)) {
    context.addIssue({ code: 'custom', message: 'Invalid verification outcome' })
  }
})
export type DirectoryEvidence = z.infer<typeof directoryEvidenceSchema>
