import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AppError } from '../types'

// Internal render resolution for the raster image embedded in SVG.
// 150 PPI gives good quality while keeping file sizes reasonable.
const SVG_RENDER_PPI = 150

// Browser canvas limits
const MAX_CANVAS_AREA = 268_435_456
const MAX_CANVAS_DIM = 16_384

/** Reduces the PPI so pixel dimensions stay within browser canvas limits. */
function clampPpi(ppi: number, widthIn: number, heightIn: number): number {
  let effective = ppi

  const desiredW = widthIn * effective
  const desiredH = heightIn * effective
  const dimRatio = Math.min(MAX_CANVAS_DIM / desiredW, MAX_CANVAS_DIM / desiredH, 1)
  if (dimRatio < 1) {
    effective = Math.floor(effective * dimRatio)
  }

  const w = Math.round(widthIn * effective)
  const h = Math.round(heightIn * effective)
  if (w * h > MAX_CANVAS_AREA) {
    const areaRatio = Math.sqrt(MAX_CANVAS_AREA / (w * h))
    effective = Math.floor(effective * areaRatio)
  }

  return effective
}

/**
 * Exports a single PDF page as an SVG Blob with physical dimensions that
 * reflect the content scale. When contentScale > 1 the SVG is physically
 * larger than 36"×24" so measurements are correct at 1/4":1' in Visio.
 * Content is rendered from the top-left — no centering or cropping.
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

  // Detect actual page size from the PDF (72 PDF points = 1 inch)
  const naturalViewport = page.getViewport({ scale: 1 })
  const actualWidthIn = naturalViewport.width / 72
  const actualHeightIn = naturalViewport.height / 72

  // Physical output in inches — grows with contentScale
  const physWidthIn = actualWidthIn * contentScale
  const physHeightIn = actualHeightIn * contentScale

  // Internal canvas pixels, clamped to browser limits
  const effectivePpi = clampPpi(SVG_RENDER_PPI, physWidthIn, physHeightIn)
  const canvasWidth = Math.round(physWidthIn * effectivePpi)
  const canvasHeight = Math.round(physHeightIn * effectivePpi)
  const scale = canvasWidth / naturalViewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const context = canvas.getContext('2d')
  if (!context) {
    const err = new AppError(
      'Could not create export canvas.',
      `canvas.getContext("2d") returned null for page ${pageNumber}`
    )
    console.error('[exportPageToSvg]', err)
    throw err
  }

  // White background
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvasWidth, canvasHeight)

  try {
    await page.render({ canvas, viewport: scaledViewport }).promise
  } catch (e) {
    const err = new AppError(
      `Could not render page ${pageNumber} for export.`,
      `page.render failed for page ${pageNumber}: ${e}`
    )
    console.error('[exportPageToSvg]', err)
    throw err
  }

  const dataUrl = canvas.toDataURL('image/png')

  // SVG dimensions in inches reflect the scaled physical size
  const svgContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `     width="${physWidthIn}in"`,
    `     height="${physHeightIn}in"`,
    `     viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
    `  <image width="${canvasWidth}" height="${canvasHeight}"`,
    `         xlink:href="${dataUrl}" />`,
    `</svg>`,
  ].join('\n')

  return new Blob([svgContent], { type: 'image/svg+xml' })
}
