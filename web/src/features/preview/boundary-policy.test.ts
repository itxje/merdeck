import { expect, it } from 'vitest'
import { renderSource, validateSource } from './source-policy'

const gantt = 'gantt\ndateFormat YYYY-MM-DD\nsection S\n'

// Ordinary syntax of every family that the owner moved out of the security boundary (PREVIEW-011).
it.each([
  'classDiagram\nAnimal <|-- Duck\nA <.. B\nclass Shape {\n  <<interface>>\n  +draw() bool\n}',
  'classDiagram\nclass Map~K~\nA "1" --> "*" B : owns & uses',
  'classDiagram\nclass A\nstyle A fill:#f00,font-weight:bold\ncssClass "A, B" warm\nclassDef warm fill:lightyellow',
  'stateDiagram-v2\nstate check <<choice>>\nstate split <<fork>>\n[*] --> check\ncheck --> split: a < b & c',
  'stateDiagram-v2\nclassDef bad fill:#f00,color:white,font-weight:bold,stroke-width:2px,stroke:yellow\n[*] --> A:::bad\nclass A bad',
  'sequenceDiagram\nA->>B: R&D uses CSS, links and style guides\nB-->>A: see https://example.invalid/a and C:\\temp\\x\nA->>B: x < y; B->>A: data: 42',
  'erDiagram\nCUSTOMER ||--o{ ORDER : "places & pays"\nCUSTOMER {\n  string url "https://example.invalid"\n}\nstyle CUSTOMER fill:#eef\nclassDef warm stroke:#333\nclass ORDER warm',
  `---\ntitle: R&D < 2026 roadmap\n---\n${gantt}Build <Node> & ship :a1, 2026-01-01, 3d`,
  'pie\n"A & B": 10\n"C": 5',
  'mindmap\n  root((Centre))\n    A & B\n    <node> placeholder',
  'block-beta\ncolumns 1\na\nstyle a fill:#eef,stroke-dasharray:2 4',
  'requirementDiagram\nrequirement r {\nid: 1\ntext: t\nrisk: high\nverifymethod: test\n}\nclassDef warm fill:#eef\nclass r warm',
  'quadrantChart\nx-axis Low --> High\ny-axis Low --> High\nPoint A:::c1: [0.3, 0.6]\nclassDef c1 color: #109060, radius : 10',
  'flowchart TB\nclassDef hdr fill:#e8e8e8,stroke:#666,color:#000,font-weight:bold\nH1["Tailcat"]:::hdr ~~~ H2["keynet v0.3"]:::hdr',
  'flowchart TB\nDeploy --> Data["DATA: staging, metadata and transaction lock"]\nApps <-->|D-Bus items| MQTT\nA[x < 10 & click here] --> B\n%% Map<String, Object> reference',
  'flowchart TB\nsubgraph C["km2210-app · #![forbid(unsafe_code)]"]\n  A["#![no_std] and #![warn(missing_docs)]"]\nend',
  'flowchart LR\nA["![alt] with no destination"] --> B["trailing ![]"]',
])('admits ordinary syntax in every family: %s', (source) => {
  expect(() => validateSource(source)).not.toThrow()
  expect(() => renderSource(source)).not.toThrow()
})

// The boundary the owner kept: configuration, interaction, HTML, encoding, resources, metadata, math and arbitrary CSS.
it.each([
  ['directive', 'sequenceDiagram\n%%{init: {"theme":"dark"}}%%\nA->>B: x'],
  ['second front matter', 'classDiagram\nclass A\n---\ntitle: x\n---'],
  ['backslash in front matter', '---\ntitle: "\\x3cb\\x3e"\n---\nstateDiagram-v2\n[*] --> A'],
  ['class click', 'classDiagram\nclass A\nclick A href "https://example.invalid"'],
  ['class callback', 'classDiagram\nclass A\ncallback A "cb"'],
  ['class link', 'classDiagram\nclass A\nLINK A "https://example.invalid"'],
  ['gantt click', `${gantt}A :a1, 2026-01-01, 3d\nclick a1 call cb()`],
  ['sequence links', 'sequenceDiagram\nparticipant A\nlinks A: {"Dash": "https://example.invalid"}'],
  ['sequence properties', 'sequenceDiagram\nparticipant A\nproperties A: {"class": "x"}'],
  ['sequence details after a separator', 'sequenceDiagram\nA->>B: x; details A: {"k": "v"}'],
  ['click in a state diagram', 'stateDiagram-v2\n[*] --> A\nclick A "a.mmd"'],
  ['linkStyle in a comment', 'flowchart LR\nA --> B\n%% note; linkStyle 0 stroke:#f00'],
  ['C4 link', 'C4Context\nPerson(a, "A", $link="https://example.invalid")'],
  ['C4 sprite', 'C4Context\nPerson(a, "A", $legendSprite="x")'],
  ['HTML in a class member', 'classDiagram\nclass A {\n  +<b>name</b>\n}'],
  ['HTML closing tag in a pie label', 'pie\n"</title>": 10'],
  ['custom element in a sequence message', 'sequenceDiagram\nA->>B: <my-widget>'],
  ['HTML attributes in a placeholder', 'sequenceDiagram\nA->>B: <Node onload=x>'],
  ['entity in an ER label', 'erDiagram\nA ||--o{ B : "&lt;b&gt;"'],
  ['Mermaid escape in a gantt task', `${gantt}Task #60;b#62; :a1, 2026-01-01, 3d`],
  ['Markdown image in a mindmap', 'mindmap\n  root\n    ![x](y.png)'],
  ['Markdown image with a space before its destination', 'flowchart LR\nA["![x] (y.png)"] --> B'],
  ['Markdown image reference in a flowchart label', 'flowchart LR\nA["![x][ref]"] --> B'],
  ['Markdown image in a Markdown string label', 'flowchart LR\nA["`![x](y.png)`"] --> B'],
  ['url in a state label', 'stateDiagram-v2\nA --> B: url(https://example.invalid)'],
  ['image-set in a gantt marker', 'gantt\ndateFormat YYYY-MM-DD\ntodayMarker stroke:image-set("/probe")\nsection S\nA :a1, 2026-01-01, 3d'],
  ['javascript scheme in a class note', 'classDiagram\nclass A\nnote for A "javascript:alert(1)"'],
  ['metadata in a sequence participant', 'sequenceDiagram\nparticipant A@{ "type": "database" }'],
  ['math in a class label', 'classDiagram\nclass A["$$x^2$$"]'],
  ['arbitrary CSS in a state classDef', 'stateDiagram-v2\nclassDef bad background:url(x)\n[*] --> A'],
  ['font family in an ER style', 'erDiagram\nA ||--o{ B : x\nstyle A font-family:probe'],
  ['arbitrary CSS in a quadrant classDef', 'quadrantChart\nx-axis L --> H\ny-axis L --> H\nclassDef c1 filter:blur(1px)'],
  ['malformed class assignment in a state diagram', 'stateDiagram-v2\n[*] --> A\nclass A bad[onclick]'],
  ['malformed cssClass', 'classDiagram\nclass A\ncssClass "A;B" warm'],
  ['backslash in a todayMarker', 'gantt\ndateFormat YYYY-MM-DD\ntodayMarker stroke:\\75 rl(x)\nsection S\nA :a1, 2026-01-01, 3d'],
  ['backslash in a sequence rect', 'sequenceDiagram\nrect rgb(0,0,0)\\75\nA->>B: x\nend'],
  ['backslash in a C4 style parameter', 'C4Context\nPerson(a, "A")\nUpdateElementStyle(a, $bgColor="\\75 rl(x)")'],
  ['backslash in a quadrant point style', 'quadrantChart\nx-axis L --> H\ny-axis L --> H\nPoint A: [0.3, 0.6] color: \\75 rl(x)'],
  ['control character', 'timeline\ntitle x\u0007'],
])('keeps the boundary in every family: %s', (_, source) => {
  expect(() => validateSource(source)).toThrow('plain Mermaid')
})
