import { AppError } from '../types'
import { LAST_SAVE_FOLDER_KEY } from '../constants'

/**
 * Saves a Blob to disk using the best available method for the current platform.
 * Tauri desktop: uses native save dialog with last-folder memory.
 * Browser: uses File System Access API, or anchor download fallback on iOS.
 */
export async function saveFile(blob: Blob, suggestedName: string): Promise<void> {
  if (window.__TAURI__) {
    await saveTauri(blob, suggestedName)
  } else {
    await saveBrowser(blob, suggestedName)
  }
}

async function saveTauri(blob: Blob, suggestedName: string): Promise<void> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { load: loadStore } = await import('@tauri-apps/plugin-store')

  const store = await loadStore(LAST_SAVE_FOLDER_KEY)
  const lastFolder = await store.get<string>('path')

  const filePath = await save({
    defaultPath: lastFolder ? `${lastFolder}/${suggestedName}` : suggestedName,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  })

  if (!filePath) {
    const err = new AppError(
      'Save cancelled.',
      'User cancelled the Tauri save dialog'
    )
    console.error('[saveTauri]', err)
    throw err
  }

  // Write the blob to the selected path via Tauri IPC
  const { invoke } = await import('@tauri-apps/api/core')
  const arrayBuffer = await blob.arrayBuffer()
  try {
    await invoke('write_file', {
      path: filePath,
      contents: Array.from(new Uint8Array(arrayBuffer)),
    })
  } catch (e) {
    const err = new AppError(
      'Could not save file. Do you have write permissions?',
      `Tauri write_file invoke failed for "${filePath}": ${e}`
    )
    console.error('[saveTauri]', err)
    throw err
  }

  // Remember the folder for next time
  const folder = filePath.substring(0, filePath.lastIndexOf('/'))
  await store.set('path', folder)
  await store.save()
}

async function saveBrowser(blob: Blob, suggestedName: string): Promise<void> {
  // Feature-detect File System Access API
  if (!('showSaveFilePicker' in window)) {
    // iOS and older browsers — anchor download fallback is expected, not an error
    console.info('[saveBrowser] showSaveFilePicker not supported, using anchor download')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return
  }

  let handle: FileSystemFileHandle
  try {
    handle = await window.showSaveFilePicker!({
      suggestedName,
      types: [
        {
          description: 'ZIP Archive',
          accept: { 'application/zip': ['.zip'] },
        },
      ],
    })
  } catch (e) {
    const err = new AppError(
      'Save cancelled or not supported by your browser.',
      `showSaveFilePicker failed: ${e}`
    )
    console.error('[saveBrowser]', err)
    throw err
  }

  try {
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
  } catch (e) {
    const err = new AppError(
      'Could not write the file. Please try again.',
      `FileSystemWritableFileStream write failed: ${e}`
    )
    console.error('[saveBrowser]', err)
    throw err
  }
}
