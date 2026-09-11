import { expect, test } from 'bun:test'
import { binaryName, releaseArguments, releaseVersion } from '../../scripts/release-version'

test('canonical release tags preserve strict SemVer and prerelease identity', () => {
  expect(releaseVersion('v0.0.0-ci.fixture')).toEqual({ tag: 'v0.0.0-ci.fixture', version: '0.0.0-ci.fixture', prerelease: true })
  expect(releaseVersion('v12.30.40').prerelease).toBe(false)
  for (const tag of ['1.2.3', 'v01.2.3', 'v1.02.3', 'v1.2.03', 'v1.2', 'v1.2.3-01', 'v1.2.3-a..b', 'v1.2.3+build', 'v1.2.3\n', 'v1.2.3;echo bad', 'main'])
    expect(() => releaseVersion(tag)).toThrow()
  expect(binaryName('v0.0.0-ci.fixture', 'bun-linux-x64')).toBe('merdeck-0.0.0-ci.fixture-linux-x64')
  expect(() => releaseArguments(['--tag', 'v1.2.3', '--target', 'bun-windows-x64'])).toThrow()
  expect(() => releaseArguments(['--tag', 'v1.2.3'])).toThrow()
})
