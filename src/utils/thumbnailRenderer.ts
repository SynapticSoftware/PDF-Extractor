import type { PDFPageProxy } from 'pdfjs-dist'
import { AppError } from '../types'
import { THUMBNAIL_PREVIEW_WIDTH_PX } from '../constants'

/**
 * Renders a PDF page to an offscreen canvas at THUMBNAIL_PREVIEW_WIDTH_PX wide.
 * Height is calculated proportionally to maintain aspect ratio.
 * Returns canvas content as a base64 PNG data URL.
 */
export async function renderThumbnail(page: PDFPageProxy): Promise<string> {
  const naturalViewport = page.getViewport({ scale: 1 })
  const scale = THUMBNAIL_PREVIEW_WIDTH_PX / naturalViewport.width
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const context = canvas.getContext('2d')
  if (!context) {
    const err = new AppError(
      'Could not create thumbnail preview.',
      `canvas.getContext("2d") returned null for page ${page.pageNumber}`
    )
    console.error('[renderThumbnail]', err)
    throw err
  }

  try {
    await page.render({ canvas, viewport }).promise
  } catch (e) {
    const err = new AppError(
      'Could not render page thumbnail.',
      `page.render failed for page ${page.pageNumber}: ${e}`
    )
    console.error('[renderThumbnail]', err)
    throw err
  }

  return canvas.toDataURL('image/png')
}
