import { z } from 'zod'
import { releaseVersion } from '../release-version'
import { archiveName, bundleEntry } from './archive'
import { bundleFiles } from './bundle-manifest'
import { sha256 } from './manifest'

export type Transport = (path: string, method?: string, data?: unknown) => Promise<unknown>
const assetSchema = z.object({ id: z.number().int(), name: z.string(), size: z.number(), state: z.string(), digest: z.string().nullable() })
const releaseSchema = z.object({ id: z.number().int(), tag_name: z.string(), target_commitish: z.string(), draft: z.boolean(), prerelease: z.boolean(), body: z.string().nullable() })
const referenceSchema = z.object({ object: z.object({ type: z.enum(['commit', 'tag']), sha: z.string().regex(/^[a-f0-9]{40}$/) }) })

export async function publishRelease(directory: string, tag: string, commit: string, transport: Transport) {
  const { manifest, assets } = await bundleFiles(directory, tag, commit)
  const version = releaseVersion(tag)
  let reference = referenceSchema.parse(await transport(`/git/ref/tags/${encodeURIComponent(tag)}`))
  for (let depth = 0; reference.object.type === 'tag' && depth < 5; depth++)
    reference = referenceSchema.parse(await transport(`/git/tags/${reference.object.sha}`))
  if (reference.object.type !== 'commit' || reference.object.sha !== commit)
    throw new Error('Remote tag does not resolve to the checked commit')
  const marker = `<!-- merdeck-release:${JSON.stringify({ tag, version: version.version, commit, runtime: manifest.runtime, assets: assets.map(asset => ({ name: asset.name, sha256: sha256(asset.bytes) })) })} -->`
  // Authenticated listing includes drafts; the by-tag endpoint only promises published releases.
  let existing: unknown = null
  for (let page = 1; page <= 10; page++) {
    const batch = z.array(releaseSchema).parse(await transport(`/releases?per_page=100&page=${page}`))
    for (const item of batch.filter(item => item.tag_name === tag)) {
      if (existing !== null)
        throw new Error('Duplicate releases for the same tag require manual review')
      existing = item
    }
    if (batch.length < 100)
      break
    if (page === 10)
      throw new Error('Release history exceeds the bounded identity scan')
  }
  let release: z.infer<typeof releaseSchema>
  if (existing === null) {
    const notes = z.object({ body: z.string() }).parse(await transport('/releases/generate-notes', 'POST', { tag_name: tag, target_commitish: commit }))
    const body = `${notes.body}\n\n\`${archiveName}\` holds \`${bundleEntry}\` and the built interface beside it, and runs on any architecture: \`tar -xzf ${archiveName} && bun ${bundleEntry}\`. It requires Linux procfs, verified project storage and Bun 1.4.2 or newer on the host; no source checkout is needed. Verify SHA256SUMS before extracting. Read the tagged README and All rights reserved LICENSE.\n\n${marker}`
    release = releaseSchema.parse(await transport('/releases', 'POST', { tag_name: tag, target_commitish: commit, name: `Merdeck ${version.version}`, body, draft: true, prerelease: version.prerelease }))
  }
  else { release = releaseSchema.parse(existing) }
  if (release.tag_name !== tag || release.target_commitish !== commit || release.prerelease !== version.prerelease || !release.body?.includes(marker))
    throw new Error('Existing release identity or artifact provenance mismatch')
  const list = async () => z.array(assetSchema).parse(await transport(`/releases/${release.id}/assets?per_page=100`))
  const present = await list()
  if (present.length > assets.length || new Set(present.map(asset => asset.name)).size !== present.length || present.some(asset => !assets.some(item => item.name === asset.name)))
    throw new Error('Existing release has unrelated or duplicate assets')
  for (const asset of assets) {
    const remote = present.find(item => item.name === asset.name)
    if (remote) {
      if (remote.state !== 'uploaded' || remote.size !== asset.bytes.byteLength || remote.digest !== `sha256:${sha256(asset.bytes)}`)
        throw new Error('Existing release asset mismatch; no assets will be replaced')
    }
    else if (!release.draft) {
      throw new Error('Published release is incomplete; refusing mutation')
    }
  }
  for (const asset of assets) {
    if (!present.some(item => item.name === asset.name))
      await transport(`/releases/${release.id}/assets?name=${encodeURIComponent(asset.name)}`, 'UPLOAD', asset.bytes)
  }
  const uploaded = await list()
  if (uploaded.length !== assets.length || assets.some(asset => !uploaded.some(item => item.name === asset.name && item.state === 'uploaded' && item.size === asset.bytes.byteLength && item.digest === `sha256:${sha256(asset.bytes)}`)))
    throw new Error('Complete matching assets are required before publishing')
  if (release.draft)
    release = releaseSchema.parse(await transport(`/releases/${release.id}`, 'PATCH', { draft: false }))
  if (release.draft)
    throw new Error('Release remained a draft')
  return { id: release.id, reused: existing !== null, assets: uploaded.map(asset => asset.name) }
}
