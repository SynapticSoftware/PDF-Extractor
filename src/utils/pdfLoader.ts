import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AppError } from '../types'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

/**
 * Reads a File as an ArrayBuffer and loads it as a PDF document.
 * Throws AppError if the file cannot be read or is not a valid PDF.
 */
export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  let arrayBuffer: ArrayBuffer
  try {
    arrayBuffer = await file.arrayBuffer()
  } catch (e) {
    const err = new AppError(
      'Could not read the file. Is it accessible?',
      `file.arrayBuffer() failed for "${file.name}": ${e}`
    )
    console.error('[loadPdf]', err)
    throw err
  }

  try {
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    return pdf
  } catch (e) {
    const err = new AppError(
      'Could not read PDF. Is the file corrupted?',
      `pdfjs.getDocument failed for "${file.name}": ${e}`
    )
    console.error('[loadPdf]', err)
    throw err
  }
}
