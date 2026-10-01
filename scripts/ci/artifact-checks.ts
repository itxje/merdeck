export async function checkArtifacts(binary: () => Promise<void>, bundle: () => Promise<void>) {
  const results = await Promise.allSettled([Promise.resolve().then(binary), Promise.resolve().then(bundle)])
  const failures = results.filter(result => result.status === 'rejected').map(result => result.reason as unknown)
  if (failures.length)
    throw new AggregateError(failures, 'Artifact acceptance failed; both checks have finished cleanup')
}
