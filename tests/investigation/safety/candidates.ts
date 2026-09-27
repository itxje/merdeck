import type { Run } from './baseline-scenarios'
import assert from 'node:assert/strict'
import { copyFile, link, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { actor, startActor } from './process'
import { errorCode, external, hash, later, original, proposed, snapshot } from './support'

export async function candidateScenarios(run: Run): Promise<void> {
  for (const strategy of ['copy-write', 'link-write', 'link-replace']) {
    const id = `candidate-${strategy}`
    await run(id, async (f) => {
      const backup = join(dirname(f.target), 'retained.mmd')
      const draft = join(dirname(f.target), 'draft.mmd')
      if (strategy.startsWith('copy'))
        await copyFile(f.target, backup)
      else
        await link(f.target, backup)
      const retainedBefore = await snapshot(backup)
      await writeFile(draft, proposed)
      const mutation = await actor(f.base, strategy.endsWith('replace') ? 'replace' : 'write', f.target)
      await rename(draft, f.target)
      const retained = await snapshot(backup)
      const visible = (await actor(f.base, 'observe', f.target)).after
      const preservesThisExternal = strategy === 'link-write'
      assert.equal(visible.hash, hash(proposed))
      assert.equal(retained.hash, hash(preservesThisExternal ? external : original))
      return { id, classification: 'candidate-diagnostic', strategy, mutation, retainedBefore, retained, visible, externalRecoverable: preservesThisExternal, originalSnapshotMutated: preservesThisExternal, returnedProtocolStatus: 'No production protocol implemented', retainedHashes: [visible.hash, retained.hash] }
    })
  }
  for (const schedule of ['late-descriptor', 'replacement-before-unlink']) {
    const id = `candidate-cleanup-${schedule}`
    await run(id, async (f) => {
      const backup = join(dirname(f.target), 'retained.mmd')
      const draft = join(dirname(f.target), 'draft.mmd')
      const holder = schedule === 'late-descriptor' ? startActor(f.base, 'hold', f.target) : undefined
      if (holder)
        await holder.ready
      await link(f.target, backup)
      await writeFile(draft, proposed)
      await rename(draft, f.target)
      const cleanupValidation = await snapshot(backup)
      assert.equal(cleanupValidation.hash, hash(original))
      const mutation = holder ? null : await actor(f.base, 'replace', backup)
      if (holder)
        holder.release()
      const descriptorMutation = holder ? await holder.done : null
      const beforeCleanup = await snapshot(backup)
      assert.equal(beforeCleanup.hash, hash(external))
      await unlink(backup)
      const retained = await snapshot(backup)
      assert.equal(retained.exists, false)
      assert.equal((await snapshot(f.target)).hash, hash(proposed))
      if (descriptorMutation)
        assert.equal(descriptorMutation.descriptor?.writeError, null)
      return { id, classification: 'candidate-diagnostic', cleanupValidation, mutation, descriptorMutation, beforeCleanup, retained, externalRecoverableAfterCleanup: false, retainedHashes: [hash(proposed)], explanation: 'Validation cannot reserve a backup pathname or bound the lifetime of an existing writable descriptor' }
    })
  }
  await run('candidate-quarantine-conflict', async (f) => {
    const backup = join(dirname(f.target), 'retained.mmd')
    const draft = join(dirname(f.target), 'draft.mmd')
    await writeFile(draft, proposed)
    await rename(f.target, backup)
    const missingWindow = await actor(f.base, 'observe', f.target)
    assert.equal(missingWindow.after.exists, false)
    const mutation = await actor(f.base, 'replace', f.target)
    let publicationError = ''
    try {
      await link(draft, f.target)
    }
    catch (error) { publicationError = errorCode(error) }
    assert.equal(publicationError, 'EEXIST')
    const versions = await Promise.all([backup, draft, f.target].map(snapshot))
    assert.deepEqual(versions.map(item => item.hash), [hash(original), hash(proposed), hash(external)])
    return { id: 'candidate-quarantine-conflict', classification: 'candidate-diagnostic', missingWindow, mutation, publicationError, mappedCandidateError: 'conflict', retainedVersions: versions, retainedHashes: versions.map(item => item.hash), meetsVisibilityRequirement: false, restartAction: 'Reconcile all three named artifacts; never overwrite the current target during rollback' }
  })
  await run('candidate-rollback-overwrite', async (f) => {
    const backup = join(dirname(f.target), 'retained.mmd')
    const draft = join(dirname(f.target), 'draft.mmd')
    await copyFile(f.target, backup)
    await writeFile(draft, proposed)
    await rename(draft, f.target)
    const validated = await snapshot(f.target)
    assert.equal(validated.hash, hash(proposed))
    const mutation = await actor(f.base, 'replace', f.target, later)
    await rename(backup, f.target)
    const after = await snapshot(f.target)
    assert.equal(after.hash, hash(original))
    assert.deepEqual(await readdir(dirname(f.target)), ['diagram.mmd'])
    return { id: 'candidate-rollback-overwrite', classification: 'candidate-diagnostic', validated, mutation, after, externalRecoverable: false, retainedHashes: [after.hash], explanation: 'A validated rollback can destroy a later independent version just like initial publication' }
  })
}
