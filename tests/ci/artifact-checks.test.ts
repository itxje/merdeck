import { expect, test } from 'bun:test'
import { checkArtifacts } from '../../scripts/ci/artifact-checks'

function pending() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('both artifact suites start before either finishes', async () => {
  const binary = pending()
  const bundle = pending()
  const started: string[] = []
  const check = checkArtifacts(
    () => {
      started.push('binary')
      return binary.promise
    },
    () => {
      started.push('bundle')
      return bundle.promise
    },
  )
  await Promise.resolve()
  try {
    expect(started).toEqual(['binary', 'bundle'])
  }
  finally {
    binary.resolve()
    bundle.resolve()
    await check
  }
})

test('a failed artifact waits for its sibling cleanup and preserves both errors', async () => {
  const cleanup = pending()
  const binaryError = new Error('binary refused')
  const bundleError = new Error('bundle refused after cleanup')
  let settled = false
  let failure: unknown
  const check = checkArtifacts(
    () => Promise.reject(binaryError),
    async () => {
      await cleanup.promise
      throw bundleError
    },
  ).catch((error: unknown) => {
    failure = error
    settled = true
  })
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  try {
    expect(settled).toBe(false)
  }
  finally {
    cleanup.resolve()
    await check
  }
  expect(failure).toBeInstanceOf(AggregateError)
  expect((failure as AggregateError).errors).toEqual([binaryError, bundleError])
})

test('a synchronous failure still starts and awaits the other artifact suite', async () => {
  let checked = false
  await expect(checkArtifacts(
    () => { throw new Error('startup refused') },
    async () => { checked = true },
  )).rejects.toBeInstanceOf(AggregateError)
  expect(checked).toBe(true)
})
