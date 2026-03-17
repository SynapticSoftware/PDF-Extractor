import type { PDFDocumentProxy } from 'pdfjs-dist'
import { AppError } from '../types'
import { OUTPUT_WIDTH_INCHES, OUTPUT_HEIGHT_INCHES } from '../constants'

// Most browsers cap canvas dimensions at 16 384 px and total area at ~268 M px.
const MAX_CANVAS_AREA = 268_435_456
const MAX_CANVAS_DIM = 16_384

/**
 * Reduces the requested PPI so that the output pixel dimensions stay within
 * browser canvas limits for the given physical size.
 */
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
 * Exports a single PDF page as a PNG Blob.
 *
 * Output canvas is (OUTPUT_*_INCHES × contentScale) at the given PPI.
 * When contentScale > 1 the image is physically larger than 36"×24" so that
 * measurements remain correct when placed in a Visio page at 1/4":1' scale.
 * Content is rendered from the top-left corner — no centering or cropping.
 *
 * If the pixel dimensions would exceed browser canvas limits the effective PPI
 * is reduced automatically; the pHYs chunk still reflects the actual pixels-per-inch
 * so Visio places the image at the correct physical size.
 *
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

  // Physical output size in inches — grows with contentScale
  const physWidthIn = OUTPUT_WIDTH_INCHES * contentScale
  const physHeightIn = OUTPUT_HEIGHT_INCHES * contentScale

  // Pixel dimensions, reduced if exceeding browser canvas limits
  const effectivePpi = clampPpi(ppi, physWidthIn, physHeightIn)
  const outputWidth = Math.round(physWidthIn * effectivePpi)
  const outputHeight = Math.round(physHeightIn * effectivePpi)

  // Scale PDF to fill canvas width; content starts at top-left
  const naturalViewport = page.getViewport({ scale: 1 })
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

  // White background — covers any aspect-ratio gap at bottom/right edge
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, outputWidth, outputHeight)

  try {
    await page.render({ canvas, viewport: scaledViewport }).promise
  } catch (e) {
    const err = new AppError(
      `Could not render page ${pageNumber} for export.`,
      `page.render failed for page ${pageNumber} at ${effectivePpi} PPI: ${e}`
    )
    console.error('[exportPageToPng]', err)
    throw err
  }

  return canvasToBlob(canvas, pageNumber, effectivePpi)
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
 * render the image at the correct physical size.
 * The pHYs chunk is inserted immediately after the IHDR chunk (byte 33).
 */
async function injectPngPhys(blob: Blob, ppi: number): Promise<Blob> {
  const src = new Uint8Array(await blob.arrayBuffer())

  // IHDR always ends at byte 33: 8 (signature) + 25 (IHDR chunk)
  const IHDR_END = 33
  const pixelsPerMeter = Math.round(ppi / 0.0254)

  // Build type + data for CRC: "pHYs" (4 bytes) + data (9 bytes)
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
