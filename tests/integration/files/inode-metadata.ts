import type { BigIntStats } from 'node:fs'

export function metadata(stat: BigIntStats) {
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
    birthtimeNs: String(stat.birthtimeNs),
    nlink: String(stat.nlink),
  }
}
