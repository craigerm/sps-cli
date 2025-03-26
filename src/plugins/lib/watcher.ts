import chokidar from 'chokidar'
import { type LoggerFunc } from '../../utils/logger'

type WatcherListener = {
  onChange: (path: string) => void
  onAdd: (path: string) => void
  onDelete: (path: string) => void
}

export function createWatcher(
  log: LoggerFunc,
  folders: string | string[],
  listener: WatcherListener
) {
  log('Creating watcher')

  // Hmm unsure about this
  // interval: 100,
  const watcher = chokidar.watch(folders, {
    ignoreInitial: true,
    awaitWriteFinish: true,
  })

  // This avoids getting notified of all changes during the initial "watch".
  let isReady = false

  watcher.on('ready', () => {
    log('Watcher ready')
    isReady = true
  })

  watcher.on('change', (file: string) => {
    if (isReady) {
      log(`File changed: ${file}`)
      listener.onChange(file)
    }
  })

  watcher.on('add', (file: string) => {
    if (isReady) {
      log(`File added: ${file}`)
      listener.onAdd(file)
    }
  })

  watcher.on('unlink', (file: string) => {
    if (isReady) {
      log(`File deleted: ${file}`)
      listener.onDelete(file)
    }
  })
}
