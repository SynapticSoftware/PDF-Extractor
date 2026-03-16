import JSZip from 'jszip'
import { AppError } from '../types'

/**
 * Creates a ZIP archive from an array of named PNG blobs.
 * Each blob is added as "{name}.png" inside the archive.
 * Returns the ZIP as a Blob.
 */
export async function buildZip(pages: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const zip = new JSZip()

  for (const { name, blob } of pages) {
    zip.file(`${name}.png`, blob)
  }

  try {
    return await zip.generateAsync({ type: 'blob' })
  } catch (e) {
    const err = new AppError(
      'Could not create ZIP archive.',
      `zip.generateAsync failed: ${e}`
    )
    console.error('[buildZip]', err)
    throw err
  }
}
