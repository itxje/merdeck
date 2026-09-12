export const resourceTextSequence = `---
title: Proxy traffic
---
%% Reference: https://example.invalid/reference
sequenceDiagram
  participant A as Client
  participant B as Server
  A->>B: Request
  Note over A,B: Proxy command: curl http://server.invalid:8081/
  B-->>A: Response
`

export const resourceTextClass = `---
title: Address information
---
classDiagram
  class Address {
    +string text
  }
  note for Address "base64url(CBOR(value))\\nEncoded address\\nStored locally"
`
