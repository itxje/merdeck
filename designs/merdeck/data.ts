export interface DiagramBlock {
  id: string
  title: string
  line: number
  source: string
}
export interface ProjectFile {
  path: string
  blocks: DiagramBlock[]
}
export const files: ProjectFile[] = [
  {
    path: 'docs/overview.md',
    blocks: [
      {
        id: 'pipeline',
        title: 'Diagram pipeline',
        line: 6,
        source: `flowchart TD
    A[Project files] --> B[Read selected file]
    B --> C{Markdown?}
    C -->|Yes| D[Select Mermaid block]
    C -->|No| E[Standalone source]
    D --> F[Render preview]
    E --> F
    F --> G[Edit and save]`,
      },
      {
        id: 'lifecycle',
        title: 'Edit lifecycle',
        line: 22,
        source: `stateDiagram-v2
    [*] --> Saved
    Saved --> Draft: Edit source
    Draft --> Saving: Save
    Saving --> Saved: Version matches
    Saving --> Conflict: File changed
    Conflict --> Draft: Review changes`,
      },
    ],
  },
  {
    path: 'sequence.mermaid',
    blocks: [{ id: 'sequence', title: 'Save sequence', line: 1, source: `sequenceDiagram
    participant Editor
    participant Service
    participant File
    Editor->>Service: Save source + version
    Service->>File: Compare current version
    File-->>Service: Version matches
    Service->>File: Replace selected block
    Service-->>Editor: Saved + new version` }],
  },
  {
    path: 'welcome.mmd',
    blocks: [{ id: 'welcome', title: 'Welcome', line: 1, source: `flowchart LR
    Browse[Browse files] --> Edit[Edit source]
    Edit --> Preview[See your diagram]
    Preview --> Save[Save changes]` }],
  },
  { path: 'README.md', blocks: [] },
]
export const scenarios = ['Ready', 'Loading', 'Empty project', 'No selection', 'Disconnected', 'Session expired', 'File deleted'] as const
export type Scenario = typeof scenarios[number]
export interface Draft {
  source: string
  saved: string
  remote: string | null
  saving: boolean
}
export function initialDrafts(): Record<string, Draft> {
  return Object.fromEntries(files.flatMap(file => file.blocks.map(block => [block.id, { source: block.source, saved: block.source, remote: null, saving: false }])))
}
