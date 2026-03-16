import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AppError } from '../types'
import { OUTPUT_WIDTH_INCHES, OUTPUT_HEIGHT_INCHES } from '../constants'

/**
 * Exports a single PDF page as a PNG Blob at the specified PPI.
 * Canvas is always OUTPUT_WIDTH_INCHES x OUTPUT_HEIGHT_INCHES at the given PPI.
 * The PDF page is scaled to fill width and letterboxed with white if aspect ratios differ.
 * MUST be called sequentially — never in parallel — to avoid memory exhaustion.
 */
export async function exportPageToPng(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  ppi: number
): Promise<Blob> {
  let page
  try {
    page = await pdfDoc.getPage(pageNumber)
  } catch (e) {
    const err = new AppError(
      `Could not load page ${pageNumber} for export.`,
      `pdfDoc.getPage(${pageNumber}) failed: ${e}`
    )
    console.error('[exportPageToPng]', err)
    throw err
  }

  const outputWidth = OUTPUT_WIDTH_INCHES * ppi
  const outputHeight = OUTPUT_HEIGHT_INCHES * ppi

  const naturalViewport = page.getViewport({ scale: 1 })
  // Scale so the PDF page fills the output canvas width exactly
  const scale = outputWidth / naturalViewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight

  const context = canvas.getContext('2d')
  if (!context) {
    const err = new AppError(
      'Could not create export canvas.',
      `canvas.getContext("2d") returned null for page ${pageNumber}`
    )
    console.error('[exportPageToPng]', err)
    throw err
  }

  // White background for letterboxing
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, outputWidth, outputHeight)

  // Center vertically if the scaled page is shorter than the output canvas
  const yOffset = Math.max(0, (outputHeight - scaledViewport.height) / 2)

  try {
    await page.render({
      canvas,
      viewport: scaledViewport,
      transform: [1, 0, 0, 1, 0, yOffset],
    }).promise
  } catch (e) {
    const err = new AppError(
      `Could not render page ${pageNumber} for export.`,
      `page.render failed for page ${pageNumber} at ${ppi} PPI: ${e}`
    )
    console.error('[exportPageToPng]', err)
    throw err
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          const err = new AppError(
            `Could not create PNG for page ${pageNumber}.`,
            `canvas.toBlob returned null for page ${pageNumber}`
          )
          console.error('[exportPageToPng]', err)
          reject(err)
          return
        }
        resolve(blob)
      },
      'image/png'
    )
  })
}
