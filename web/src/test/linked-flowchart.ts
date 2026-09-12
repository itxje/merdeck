// Four independent groups with edges to the groups themselves and an ungrouped boundary.
export const linkedTopology = `flowchart TB
  ROOT["Diagram index<br/>Current system"]
  subgraph A["Architecture"]
    A1["Components"]
    A2["Runtime"]
    A3["Routing"]
    A4["Storage"]
  end
  subgraph B["Sequences"]
    B1["Create"]
    B2["Synchronize"]
    B3["Connect"]
    B4["Verify"]
    B5["Remove"]
    B6["Access"]
  end
  subgraph C["Lifecycles"]
    C1["Service"]
    C2["Control"]
    C3["Peer"]
  end
  subgraph D["Progress"]
    D1["Milestones"]
    D2["Timeline"]
    D3["Dependencies"]
  end
  LIMITS["Boundaries<br/>Read with the sequences"]
  ROOT --> A
  ROOT --> B
  ROOT --> C
  ROOT --> D
  A --> LIMITS
  B --> LIMITS
  C --> LIMITS
  classDef entry fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e;
  classDef boundary fill:#fff7ed,stroke:#c2410c,color:#7c2d12;
  class ROOT entry;
  class LIMITS boundary;
`

export const linkedGroups = { A: ['A1', 'A2', 'A3', 'A4'], B: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'], C: ['C1', 'C2', 'C3'], D: ['D1', 'D2', 'D3'] }
export const linkedIndex = `${linkedTopology}${[...Object.values(linkedGroups).flat(), 'LIMITS'].map(id => `  click ${id} "${id.toLowerCase()}.mmd"\n`).join('')}`
