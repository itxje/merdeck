import { readFile } from 'node:fs/promises'

// Only the held descriptor's mount is selected; unrelated records/options stay internal.
export function descriptorMount(fdinfo: string, mountinfo: string) {
  const ids = fdinfo.split('\n').filter(line => line.startsWith('mnt_id:'))
  const id = ids.length === 1 ? /^mnt_id:[\t ]+([1-9]\d*)$/.exec(ids[0]!)?.[1] : undefined
  const records = mountinfo.split('\n').filter(line => line.split(' ')[0] === id)
  if (!id || records.length !== 1)
    throw new Error('The selected descriptor has no identifiable mount')
  const sections = records[0]!.split(' - ')
  const fields = sections[0]!.split(' ')
  const tail = sections[1]?.split(' ')
  const device = fields[2]
  const mountPoint = fields[4]
  const filesystem = tail?.[0]
  if (sections.length !== 2 || fields.length < 6 || !/^\d+$/.test(fields[1] ?? '')
    || !device || !/^\d+:\d+$/.test(device) || !fields[3]?.startsWith('/') || !mountPoint?.startsWith('/')
    || fields.some(field => !field) || tail?.length !== 3 || tail.some(field => !field)
    || !filesystem || !/^[a-z0-9][a-z0-9._-]*$/.test(filesystem)) {
    throw new Error('Invalid selected mount record')
  }
  if (/\\(?!040|011|012|134)/.test(mountPoint))
    throw new Error('Invalid selected mount path encoding')
  return { id, device, mountPoint: mountPoint.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8))), filesystem }
}

export type DescriptorMount = ReturnType<typeof descriptorMount>

export async function readDescriptorMount(fd: number): Promise<DescriptorMount> {
  if (!Number.isSafeInteger(fd) || fd < 0)
    throw new Error('Invalid descriptor')
  return descriptorMount(await readFile(`/proc/self/fdinfo/${fd}`, 'utf8'), await readFile('/proc/self/mountinfo', 'utf8'))
}

// Linux stat dev_t encodes the major/minor fields differently from mountinfo's decimal pair.
export function mountDevice(device: bigint): string | undefined {
  if (device < 0n || device > 0xFFFFFFFFFFFFFFFFn)
    return undefined
  const major = ((device >> 8n) & 0xFFFn) | ((device >> 32n) & 0xFFFFF000n)
  const minor = (device & 0xFFn) | ((device >> 12n) & 0xFFFFFF00n)
  return `${major}:${minor}`
}
