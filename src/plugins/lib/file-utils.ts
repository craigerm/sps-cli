import fs from 'node:fs/promises'
import path from 'node:path'
import { paths } from '../../paths'

export async function copyFileToDist(src: string, subFolder?: string) {
  const name = path.basename(src)
  const destFile = path.join(paths.dist, subFolder || '', name)
  await fs.copyFile(src, destFile)
}

export async function deleteFileFromDist(src: string, subFolder?: string) {
  const name = path.basename(src)
  const destFile = path.join(paths.dist, subFolder || '', name)
  await fs.unlink(destFile)
}
