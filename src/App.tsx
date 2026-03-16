import { useState, useCallback, useEffect } from 'react'
import { usePdfLoader } from './hooks/usePdfLoader'
import { useExport } from './hooks/useExport'
import { DropZone } from './components/DropZone'
import { PageSelector } from './components/PageSelector'
import { ExportPanel } from './components/ExportPanel'
import { ExportProgress } from './components/ExportProgress'
import { ErrorBanner } from './components/ErrorBanner'
import type { PdfPage } from './types'

/**
 * Root component. Holds top-level AppState.
 * Renders a single-page, three-step flow:
 *   Step 1 — no file loaded:              DropZone
 *   Step 2 — file loaded, not exporting:  PageSelector + ExportPanel
 *   Step 3 — exporting in progress:       ExportProgress overlay
 * Always renders ErrorBanner if error state is non-null.
 */
export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PdfPage[]>([])

  const {
    pages: loadedPages,
    pdfDoc,
    isLoading,
    loadingMessage,
    error: loadError,
    load,
  } = usePdfLoader()

  const {
    isExporting,
    progress,
    error: exportError,
    startExport,
    cancelExport,
  } = useExport()

  const [appError, setAppError] = useState<string | null>(null)
  const error = appError ?? loadError ?? exportError

  // Sync loaded pages into local state so the user can modify selections and names
  useEffect(() => {
    if (loadedPages.length > 0) {
      setPages(loadedPages)
    }
  }, [loadedPages])

  const handleFileSelected = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setAppError(null)
    await load(selectedFile)
  }, [load])

  const handlePageChange = useCallback((updated: PdfPage) => {
    setPages((prev) =>
      prev.map((p) => (p.pageNumber === updated.pageNumber ? updated : p))
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })))
  }, [])

  const handleDeselectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })))
  }, [])

  const handleExport = useCallback((ppi: number) => {
    if (!pdfDoc || !file) return
    const selected = pages.filter((p) => p.selected)
    startExport(pdfDoc, selected, ppi, file.name)
  }, [pdfDoc, file, pages, startExport])

  const handleDismissError = useCallback(() => {
    setAppError(null)
  }, [])

  const handleDropError = useCallback((message: string) => {
    setAppError(message)
  }, [])

  const selectedCount = pages.filter((p) => p.selected).length

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans">
      {error && (
        <ErrorBanner message={error} onDismiss={handleDismissError} />
      )}

      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg text-neutral-400">{loadingMessage}</p>
        </div>
      )}

      {!file && !isLoading && (
        <DropZone onFileSelected={handleFileSelected} onError={handleDropError} />
      )}

      {file && !isLoading && (
        <>
          <PageSelector
            pages={pages}
            totalPages={pages.length}
            onPageChange={handlePageChange}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onSetPages={setPages}
          />
          <ExportPanel
            selectedCount={selectedCount}
            onExport={handleExport}
          />
        </>
      )}

      {isExporting && (
        <ExportProgress
          progress={progress}
          total={selectedCount}
          onCancel={cancelExport}
        />
      )}
    </div>
  )
}
