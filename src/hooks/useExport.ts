import { useState, useCallback, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { exportPageToPng } from '../utils/pageExporter'
import { exportPageToSvg } from '../utils/svgExporter'
import { saveFiles } from '../utils/fileSaver'
import { EXPORT_FOLDER_SUFFIX } from '../constants'
import type { PdfPage, ExportFormat, AppError } from '../types'

interface UseExportReturn {
  isExporting: boolean
  progress: string
  error: string | null
  startExport: (
    pdfDoc: PDFDocumentProxy,
    selectedPages: PdfPage[],
    ppi: number,
    pdfFileName: string,
    format: ExportFormat,
    contentScale: number
  ) => Promise<void>
  cancelExport: () => void
}

/**
 * Manages the full export lifecycle: rendering pages to PNG and saving as individual files.
 * Pages are exported sequentially to avoid memory exhaustion.
 * All errors are caught here and surfaced via error state — never re-thrown.
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const cancelExport = useCallback(() => {
    cancelledRef.current = true
  }, [])

  const startExport = useCallback(async (
    pdfDoc: PDFDocumentProxy,
    selectedPages: PdfPage[],
    ppi: number,
    pdfFileName: string,
    format: ExportFormat = 'png',
    contentScale: number = 1
  ) => {
    if (selectedPages.length === 0) {
      setError('No pages selected for export.')
      return
    }

    setIsExporting(true)
    setError(null)
    cancelledRef.current = false

    try {
      // YYMMDD timestamp appended to each filename
      const now = new Date()
      const timestamp = String(now.getFullYear()).slice(2)
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0')

      const results: Array<{ name: string; blob: Blob }> = []

      for (let i = 0; i < selectedPages.length; i++) {
        if (cancelledRef.current) {
          break
        }

        const page = selectedPages[i]
        setProgress(`Exporting page ${i + 1} of ${selectedPages.length} \u2014 ${page.customName}`)

        const blob = format === 'svg'
          ? await exportPageToSvg(pdfDoc, page.pageNumber, contentScale)
          : await exportPageToPng(pdfDoc, page.pageNumber, ppi, contentScale)
        results.push({ name: `${page.customName}_${timestamp}`, blob })
      }

      if (cancelledRef.current) {
        return
      }

      // Strip extension from PDF filename and append suffix for suggested folder name
      const baseName = pdfFileName.replace(/\.pdf$/i, '')
      const suggestedFolderName = baseName + EXPORT_FOLDER_SUFFIX

      const extension = format === 'svg' ? '.svg' : '.png'

      setProgress('Saving files\u2026')
      await saveFiles(results, suggestedFolderName, extension)
    } catch (e) {
      const appError = e as AppError
      setError(appError.userMessage ?? 'An unexpected error occurred during export.')
      console.error('[useExport]', e)
    } finally {
      setIsExporting(false)
      setProgress('')
    }
  }, [])

  return { isExporting, progress, error, startExport, cancelExport }
}
