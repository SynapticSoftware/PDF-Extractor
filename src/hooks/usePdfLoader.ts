import { useState, useCallback } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdf } from '../utils/pdfLoader'
import { renderThumbnail } from '../utils/thumbnailRenderer'
import { extractSheetTitle } from '../utils/extractSheetTitle'
import { generateDefaultName } from '../utils/pageNaming'
import type { PdfPage, AppError } from '../types'

interface UsePdfLoaderReturn {
  pages: PdfPage[]
  totalPages: number
  pdfDoc: PDFDocumentProxy | null
  isLoading: boolean
  loadingMessage: string
  error: string | null
  load: (file: File) => Promise<void>
}

/**
 * Manages the full PDF load and page-initialization lifecycle.
 * Loads a PDF, renders thumbnails, extracts sheet titles, and builds PdfPage objects.
 * All errors are caught here and surfaced via error state — never re-thrown.
 */
export function usePdfLoader(): UsePdfLoaderReturn {
  const [pages, setPages] = useState<PdfPage[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setLoadingMessage('Loading PDF\u2026')
    setPages([])

    try {
      const pdf = await loadPdf(file)
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)

      const loadedPages: PdfPage[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        setLoadingMessage(`Loading page ${i} of ${pdf.numPages}\u2026`)

        const page = await pdf.getPage(i)
        const thumbnail = await renderThumbnail(page)
        const detectedName = await extractSheetTitle(page)
        const customName = generateDefaultName(detectedName, i)

        loadedPages.push({
          pageNumber: i,
          selected: false,
          customName,
          detectedName,
          thumbnail,
        })
      }

      setPages(loadedPages)
    } catch (e) {
      const appError = e as AppError
      setError(appError.userMessage ?? 'An unexpected error occurred while loading the PDF.')
      console.error('[usePdfLoader]', e)
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [])

  return { pages, totalPages, pdfDoc, isLoading, loadingMessage, error, load }
}
