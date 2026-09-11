export const actionlint = {
  version: '1.7.12',
  archives: {
    x64: { arch: 'amd64', sha256: '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8' },
    arm64: { arch: 'arm64', sha256: '325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6' },
  },
} as const

// Official release tags were resolved through each repository's commit API on 2026-09-07.
export const actionPins = {
  'actions/checkout': { version: 'v7.0.1', sha: '3d3c42e5aac5ba805825da76410c181273ba90b1' },
  'actions/setup-node': { version: 'v7.0.0', sha: '820762786026740c76f36085b0efc47a31fe5020' },
  'oven-sh/setup-bun': { version: 'v2.2.0', sha: '0c5077e51419868618aeaa5fe8019c62421857d6' },
  'actions/cache': { version: 'v6.1.0', sha: '55cc8345863c7cc4c66a329aec7e433d2d1c52a9' },
  'actions/upload-artifact': { version: 'v7.0.1', sha: '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a' },
  'actions/download-artifact': { version: 'v8.0.1', sha: '3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c' },
} as const
