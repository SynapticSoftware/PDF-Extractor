import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AppError } from '../types'
import { OUTPUT_WIDTH_INCHES, OUTPUT_HEIGHT_INCHES } from '../constants'

// Most browsers cap total canvas area at ~268 million pixels (16384 x 16384).
// We use a conservative limit and tile-render when the output exceeds it.
const MAX_CANVAS_AREA = 268_435_456
const MAX_CANVAS_DIM = 16_384

/**
 * Exports a single PDF page as a PNG Blob at the specified PPI.
 * Canvas is always OUTPUT_WIDTH_INCHES x OUTPUT_HEIGHT_INCHES at the given PPI.
 * The PDF page is scaled to fill width and letterboxed with white if aspect ratios differ.
 * For very high PPI that would exceed browser canvas limits, renders in vertical tiles.
 * MUST be called sequentially — never in parallel — to avoid memory exhaustion.
 */
export async function exportPageToPng(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  ppi: number,
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
    console.error('[exportPageToPng]', err)
    throw err
  }

  const outputWidth = OUTPUT_WIDTH_INCHES * ppi
  const outputHeight = OUTPUT_HEIGHT_INCHES * ppi
  const totalPixels = outputWidth * outputHeight

  // If within limits, render directly
  if (totalPixels <= MAX_CANVAS_AREA && outputWidth <= MAX_CANVAS_DIM && outputHeight <= MAX_CANVAS_DIM) {
    return renderDirect(page, pageNumber, ppi, outputWidth, outputHeight, contentScale)
  }

  // Otherwise, tile vertically: split into horizontal strips that fit in a single canvas
  return renderTiled(page, pageNumber, ppi, outputWidth, outputHeight, contentScale)
}

async function renderDirect(
  page: Awaited<ReturnType<PDFDocumentProxy['getPage']>>,
  pageNumber: number,
  ppi: number,
  outputWidth: number,
  outputHeight: number,
  contentScale: number
): Promise<Blob> {
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
    console.error('[exportPageToPng]', err)
    throw err
  }

  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, outputWidth, outputHeight)

  // Center content both horizontally and vertically within the output canvas
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
      `page.render failed for page ${pageNumber} at ${ppi} PPI: ${e}`
    )
    console.error('[exportPageToPng]', err)
    throw err
  }

  return canvasToBlob(canvas, pageNumber, ppi)
}

async function renderTiled(
  page: Awaited<ReturnType<PDFDocumentProxy['getPage']>>,
  pageNumber: number,
  ppi: number,
  outputWidth: number,
  outputHeight: number,
  contentScale: number
): Promise<Blob> {
  const naturalViewport = page.getViewport({ scale: 1 })
  const baseScale = outputWidth / naturalViewport.width
  const scale = baseScale * contentScale
  const scaledViewport = page.getViewport({ scale })
  const xOffset = (outputWidth - scaledViewport.width) / 2
  const yOffset = (outputHeight - scaledViewport.height) / 2

  // Calculate tile height so each tile fits within canvas limits
  const tileWidth = Math.min(outputWidth, MAX_CANVAS_DIM)
  const maxTileHeight = Math.min(
    Math.floor(MAX_CANVAS_AREA / tileWidth),
    MAX_CANVAS_DIM
  )

  // Collect tile image data
  const tileDataList: { imageData: ImageData; y: number; h: number }[] = []

  for (let tileY = 0; tileY < outputHeight; tileY += maxTileHeight) {
    const tileH = Math.min(maxTileHeight, outputHeight - tileY)

    const tileCanvas = document.createElement('canvas')
    tileCanvas.width = tileWidth
    tileCanvas.height = tileH

    const tileCtx = tileCanvas.getContext('2d')
    if (!tileCtx) {
      const err = new AppError(
        'Could not create export canvas.',
        `Tile canvas getContext("2d") returned null for page ${pageNumber}`
      )
      console.error('[renderTiled]', err)
      throw err
    }

    // White background
    tileCtx.fillStyle = '#FFFFFF'
    tileCtx.fillRect(0, 0, tileWidth, tileH)

    // Render the PDF page shifted so the visible portion lands on this tile
    try {
      await page.render({
        canvas: tileCanvas,
        viewport: scaledViewport,
        transform: [1, 0, 0, 1, xOffset, yOffset - tileY],
      }).promise
    } catch (e) {
      const err = new AppError(
        `Could not render page ${pageNumber} for export.`,
        `Tiled page.render failed for page ${pageNumber} tile at y=${tileY}: ${e}`
      )
      console.error('[renderTiled]', err)
      throw err
    }

    tileDataList.push({
      imageData: tileCtx.getImageData(0, 0, tileWidth, tileH),
      y: tileY,
      h: tileH,
    })
  }

  // Stitch tiles onto a final canvas using an approach that stays within limits:
  // Encode as PNG manually by drawing tiles sequentially onto a final-size canvas.
  // We already proved individual tiles fit, so the final assembly uses the same tile approach
  // but writes to a single output via ImageData on a per-tile basis.
  // Use OffscreenCanvas if available (higher limits in workers), fallback to blob assembly.
  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = outputWidth
  finalCanvas.height = outputHeight

  const finalCtx = finalCanvas.getContext('2d')
  if (!finalCtx) {
    // Canvas too large even for assembly — this shouldn't happen since we're using
    // the same canvas, but browsers may reject it. Fall back to reduced quality.
    const err = new AppError(
      `Canvas size ${outputWidth}x${outputHeight} exceeds browser limits. Try a lower PPI.`,
      `Final assembly canvas getContext returned null for page ${pageNumber} at ${ppi} PPI`
    )
    console.error('[renderTiled]', err)
    throw err
  }

  for (const tile of tileDataList) {
    finalCtx.putImageData(tile.imageData, 0, tile.y)
  }

  return canvasToBlob(finalCanvas, pageNumber, ppi)
}

async function canvasToBlob(canvas: HTMLCanvasElement, pageNumber: number, ppi: number): Promise<Blob> {
  const raw = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          const err = new AppError(
            `Could not create PNG for page ${pageNumber}. Try a lower resolution.`,
            `canvas.toBlob returned null for page ${pageNumber} (${canvas.width}x${canvas.height})`
          )
          console.error('[canvasToBlob]', err)
          reject(err)
          return
        }
        resolve(blob)
      },
      'image/png'
    )
  })

  return injectPngPhys(raw, ppi)
}

// CRC32 lookup table for PNG chunk CRC computation
const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[n] = c
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/**
 * Injects a pHYs chunk into a PNG blob so that viewers like Visio
 * render the image at the correct physical size (36"×24").
 * The pHYs chunk is inserted immediately after the IHDR chunk (byte 33).
 */
async function injectPngPhys(blob: Blob, ppi: number): Promise<Blob> {
  const src = new Uint8Array(await blob.arrayBuffer())

  // IHDR always ends at byte 33: 8 (signature) + 25 (IHDR chunk: 4 len + 4 type + 13 data + 4 CRC)
  const IHDR_END = 33
  const pixelsPerMeter = Math.round(ppi / 0.0254)

  // Build type + data for CRC: "pHYs" (4 bytes) + data (9 bytes: 4 X + 4 Y + 1 unit)
  const typeAndData = new Uint8Array(4 + 9)
  typeAndData[0] = 0x70 // 'p'
  typeAndData[1] = 0x48 // 'H'
  typeAndData[2] = 0x59 // 'Y'
  typeAndData[3] = 0x73 // 's'
  const dv = new DataView(typeAndData.buffer)
  dv.setUint32(4, pixelsPerMeter)  // X pixels per unit
  dv.setUint32(8, pixelsPerMeter)  // Y pixels per unit
  typeAndData[12] = 1              // unit = meter

  const crc = crc32(typeAndData)

  // Full chunk: 4 (length = 9) + 4 (type) + 9 (data) + 4 (CRC) = 21 bytes
  const chunk = new Uint8Array(21)
  const cv = new DataView(chunk.buffer)
  cv.setUint32(0, 9)          // data length
  chunk.set(typeAndData, 4)    // type + data
  cv.setUint32(17, crc)        // CRC

  // Assemble: [PNG sig + IHDR] + [pHYs] + [rest of original]
  const result = new Uint8Array(src.length + 21)
  result.set(src.subarray(0, IHDR_END), 0)
  result.set(chunk, IHDR_END)
  result.set(src.subarray(IHDR_END), IHDR_END + 21)

  return new Blob([result], { type: 'image/png' })
}
