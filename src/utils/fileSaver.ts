import { AppError } from '../types'
import { LAST_SAVE_FOLDER_KEY } from '../constants'

/**
 * Saves multiple file blobs to a user-selected directory.
 * Tauri desktop: uses native directory picker with last-folder memory.
 * Browser: uses File System Access API's showDirectoryPicker, or falls back
 * to individual anchor downloads on browsers without directory access (iOS/Firefox).
 */
export async function saveFiles(
  files: Array<{ name: string; blob: Blob }>,
  suggestedFolderName: string,
  extension: string = '.png'
): Promise<void> {
  if (window.__TAURI__) {
    await saveTauri(files, suggestedFolderName, extension)
  } else {
    await saveBrowser(files, extension)
  }
}

async function saveTauri(
  files: Array<{ name: string; blob: Blob }>,
  suggestedFolderName: string,
  extension: string
): Promise<void> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const { load: loadStore } = await import('@tauri-apps/plugin-store')
  const { invoke } = await import('@tauri-apps/api/core')

  const store = await loadStore(LAST_SAVE_FOLDER_KEY)
  const lastFolder = await store.get<string>('path')

  const selectedDir = await open({
    directory: true,
    defaultPath: lastFolder ?? undefined,
    title: `Select folder to save files (suggested: ${suggestedFolderName})`,
  })

  if (!selectedDir) {
    const err = new AppError(
      'Save cancelled.',
      'User cancelled the Tauri directory picker'
    )
    console.error('[saveTauri]', err)
    throw err
  }

  for (const { name, blob } of files) {
    const arrayBuffer = await blob.arrayBuffer()
    const filePath = `${selectedDir}/${name}${extension}`
    try {
      await invoke('write_file', {
        path: filePath,
        contents: Array.from(new Uint8Array(arrayBuffer)),
      })
    } catch (e) {
      const err = new AppError(
        `Could not save ${name}${extension}. Do you have write permissions?`,
        `Tauri write_file invoke failed for "${filePath}": ${e}`
      )
      console.error('[saveTauri]', err)
      throw err
    }
  }

  // Remember the folder for next time
  await store.set('path', selectedDir)
  await store.save()
}

async function saveBrowser(files: Array<{ name: string; blob: Blob }>, extension: string): Promise<void> {
  // Feature-detect directory picker API
  if ('showDirectoryPicker' in window) {
    let dirHandle: FileSystemDirectoryHandle
    try {
      dirHandle = await window.showDirectoryPicker!()
    } catch (e) {
      const err = new AppError(
        'Save cancelled or not supported by your browser.',
        `showDirectoryPicker failed: ${e}`
      )
      console.error('[saveBrowser]', err)
      throw err
    }

    for (const { name, blob } of files) {
      try {
        const fileHandle = await dirHandle.getFileHandle(`${name}${extension}`, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } catch (e) {
        const err = new AppError(
          `Could not save ${name}${extension}. Please try again.`,
          `Directory file write failed for "${name}${extension}": ${e}`
        )
        console.error('[saveBrowser]', err)
        throw err
      }
    }
    return
  }

  // Fallback: individual anchor downloads (iOS Safari, Firefox)
  console.info('[saveBrowser] showDirectoryPicker not supported, downloading files individually')
  for (const { name, blob } of files) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}
