export interface BuildInfo {
  version: string
  prerelease: boolean
  tag: string | null
  commit: string | null
  target: string
}

export const developmentBuild: BuildInfo = Object.freeze({ version: 'development', prerelease: false, tag: null, commit: null, target: 'source' })
