import { useState, useCallback, useEffect } from 'react'
import { usePdfLoader } from './hooks/usePdfLoader'
import { useExport } from './hooks/useExport'
import { DropZone } from './components/DropZone'
import { PageSelector } from './components/PageSelector'
import { ExportPanel } from './components/ExportPanel'
import { ExportProgress } from './components/ExportProgress'
import { ErrorBanner } from './components/ErrorBanner'
import { DEFAULT_PPI_INDEX, DEFAULT_SCALE_INDEX, DEFAULT_OUTPUT_SCALE_INDEX, PPI_OPTIONS, SOURCE_SCALE_OPTIONS, OUTPUT_SCALE_OPTIONS } from './constants'
import type { PdfPage, ExportFormat } from './types'

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
  const [ppiIndex, setPpiIndex] = useState(DEFAULT_PPI_INDEX)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scaleIndex, setScaleIndex] = useState(DEFAULT_SCALE_INDEX)
  const [outputScaleIndex, setOutputScaleIndex] = useState(DEFAULT_OUTPUT_SCALE_INDEX)

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

  const handleExport = useCallback(() => {
    if (!pdfDoc || !file) return
    const selected = pages.filter((p) => p.selected)
    const contentScale = OUTPUT_SCALE_OPTIONS[outputScaleIndex].inchesPerFoot / SOURCE_SCALE_OPTIONS[scaleIndex].inchesPerFoot
    startExport(pdfDoc, selected, PPI_OPTIONS[ppiIndex].ppi, file.name, format, contentScale)
  }, [pdfDoc, file, pages, ppiIndex, format, scaleIndex, outputScaleIndex, startExport])

  const handleDismissError = useCallback(() => {
    setAppError(null)
  }, [])

  const handleDropError = useCallback((message: string) => {
    setAppError(message)
  }, [])

  const handleGoHome = useCallback(() => {
    setFile(null)
    setPages([])
    setAppError(null)
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
            onGoHome={handleGoHome}
            format={format}
            onFormatChange={setFormat}
            ppiIndex={ppiIndex}
            onPpiChange={setPpiIndex}
            scaleIndex={scaleIndex}
            onScaleChange={setScaleIndex}
            outputScaleIndex={outputScaleIndex}
            onOutputScaleChange={setOutputScaleIndex}
          />
          <ExportPanel
            selectedCount={selectedCount}
            format={format}
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
