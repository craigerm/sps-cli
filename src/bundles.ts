import fs from 'fs'
import path from 'path'
import { DuplicateBundleError } from './errors'
import { paths } from './paths'

export function getBundlesStartingWith(filter: string, folder: string) {
  if (!fs.existsSync(folder)) {
    return []
  }
  return fs.readdirSync(folder).filter((x) => x.startsWith(filter))
}

function getBundleName(bundlePath: string) {
  return path.basename(bundlePath, path.extname(bundlePath))
}

export function getJsEntrypoints(): Record<string, string> {
  const bundles: Record<string, string> = {}

  const ensureNonDuplicate = (key: string, srcFile: string) => {
    if (bundles[key]) {
      throw new DuplicateBundleError(key, srcFile)
    }
  }

  getBundlesStartingWith('bundle.', paths.js).forEach((file) => {
    const src = path.resolve(paths.js, file)
    const key = getBundleName(src)
    ensureNonDuplicate(key, src)
    bundles[key] = src
  })

  fs.readdirSync(paths.jsComponents).forEach((file) => {
    const src = path.resolve(paths.jsComponents, file)
    const key = 'component-' + getBundleName(src)
    ensureNonDuplicate(key, src)
    bundles[key] = src
  })

  return bundles
}

export function getCSSBundles(): string[] {
  const bundlesMap: Record<string, string> = {}
  const bundles: string[] = []

  const ensureNonDuplicate = (key: string, srcFile: string) => {
    if (bundlesMap[key]) {
      throw new DuplicateBundleError(key, srcFile)
    }
  }

  getBundlesStartingWith('bundle.', paths.css).forEach((file) => {
    const src = path.resolve(paths.css, file)
    const key = getBundleName(src)
    ensureNonDuplicate(key, src)
    bundles.push(src)
    bundlesMap[key] = src
  })

  return bundles
}
