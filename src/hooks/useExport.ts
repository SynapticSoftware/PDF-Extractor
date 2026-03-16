import { useState, useCallback, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { exportPageToPng } from '../utils/pageExporter'
import { buildZip } from '../utils/zipBuilder'
import { saveFile } from '../utils/fileSaver'
import { ZIP_FILENAME_SUFFIX } from '../constants'
import type { PdfPage, AppError } from '../types'

interface UseExportReturn {
  isExporting: boolean
  progress: string
  error: string | null
  startExport: (
    pdfDoc: PDFDocumentProxy,
    selectedPages: PdfPage[],
    ppi: number,
    pdfFileName: string
  ) => Promise<void>
  cancelExport: () => void
}

/**
 * Manages the full export lifecycle: rendering pages to PNG, building a ZIP, and saving.
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
    pdfFileName: string
  ) => {
    if (selectedPages.length === 0) {
      setError('No pages selected for export.')
      return
    }

    setIsExporting(true)
    setError(null)
    cancelledRef.current = false

    try {
      const results: Array<{ name: string; blob: Blob }> = []

      for (let i = 0; i < selectedPages.length; i++) {
        if (cancelledRef.current) {
          break
        }

        const page = selectedPages[i]
        setProgress(`Exporting page ${i + 1} of ${selectedPages.length} \u2014 ${page.customName}`)

        const blob = await exportPageToPng(pdfDoc, page.pageNumber, ppi)
        results.push({ name: page.customName, blob })
      }

      if (cancelledRef.current) {
        return
      }

      setProgress('Building ZIP archive\u2026')
      const zipBlob = await buildZip(results)

      // Strip extension from PDF filename and append suffix
      const baseName = pdfFileName.replace(/\.pdf$/i, '')
      const suggestedName = baseName + ZIP_FILENAME_SUFFIX

      setProgress('Saving\u2026')
      await saveFile(zipBlob, suggestedName)
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
