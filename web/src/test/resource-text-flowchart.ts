export const resourceTextFlowchart = `---
title: Process overview
---
flowchart LR
  subgraph SERVER["Server"]
    ENCODE["Address<br/>base64url(CBOR(ConnInfo))"]
  end
  MAP["Map<br/>https://example.invalid/map.json"]
  subgraph CLIENT["Client"]
    CONNECT["Connection"]
  end
  SERVER <--> MAP
  MAP <-.-> CLIENT
`
