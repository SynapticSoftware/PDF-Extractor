import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AppError } from '../types'
import { OUTPUT_WIDTH_INCHES, OUTPUT_HEIGHT_INCHES } from '../constants'

// Internal render resolution for the raster image embedded in SVG.
// 150 PPI gives good quality while keeping file sizes reasonable.
const SVG_RENDER_PPI = 150

/**
 * Exports a single PDF page as an SVG Blob with 36"x24" physical dimensions.
 * The PDF content is rendered to a canvas and embedded as a base64 image
 * inside the SVG, preserving correct print dimensions.
 * MUST be called sequentially — never in parallel — to avoid memory exhaustion.
 */
export async function exportPageToSvg(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  contentScale: number = 1
): Promise<Blob> {
  let page
  try {
    page = await pdfDoc.getPage(pageNumber)
  } catch (e) {
    const err = new AppError(
      `Could not load page ${pageNumber} for export.`,
      `pdfDoc.getPage(${pageNumber}) failed: ${e}`
    )
    console.error('[exportPageToSvg]', err)
    throw err
  }

  const outputWidth = OUTPUT_WIDTH_INCHES * SVG_RENDER_PPI
  const outputHeight = OUTPUT_HEIGHT_INCHES * SVG_RENDER_PPI

  const naturalViewport = page.getViewport({ scale: 1 })
  const baseScale = outputWidth / naturalViewport.width
  const scale = baseScale * contentScale
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
    console.error('[exportPageToSvg]', err)
    throw err
  }

  // White background for letterboxing
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, outputWidth, outputHeight)

  // Center content both horizontally and vertically
  const xOffset = (outputWidth - scaledViewport.width) / 2
  const yOffset = (outputHeight - scaledViewport.height) / 2

  try {
    await page.render({
      canvas,
      viewport: scaledViewport,
      transform: [1, 0, 0, 1, xOffset, yOffset],
    }).promise
  } catch (e) {
    const err = new AppError(
      `Could not render page ${pageNumber} for export.`,
      `page.render failed for page ${pageNumber}: ${e}`
    )
    console.error('[exportPageToSvg]', err)
    throw err
  }

  const dataUrl = canvas.toDataURL('image/png')

  const svgContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `     width="${OUTPUT_WIDTH_INCHES}in"`,
    `     height="${OUTPUT_HEIGHT_INCHES}in"`,
    `     viewBox="0 0 ${outputWidth} ${outputHeight}">`,
    `  <image width="${outputWidth}" height="${outputHeight}"`,
    `         xlink:href="${dataUrl}" />`,
    `</svg>`,
  ].join('\n')

  return new Blob([svgContent], { type: 'image/svg+xml' })
}
