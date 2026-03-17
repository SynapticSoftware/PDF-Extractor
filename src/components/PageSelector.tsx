import { useState, useCallback, useMemo } from 'react'
import { PageThumbnail } from './PageThumbnail'
import { PPI_OPTIONS, SCALE_OPTIONS, TARGET_INCHES_PER_FOOT, PNG_COMPRESSION_RATIO_MIN, PNG_COMPRESSION_RATIO_MAX } from '../constants'
import type { PdfPage, ExportFormat } from '../types'

interface PageSelectorProps {
  pages: PdfPage[]
  totalPages: number
  onPageChange: (updated: PdfPage) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSetPages: (updater: (prev: PdfPage[]) => PdfPage[]) => void
  onGoHome: () => void
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  ppiIndex: number
  onPpiChange: (index: number) => void
  scaleIndex: number
  onScaleChange: (index: number) => void
}

/**
 * Renders a responsive grid of PageThumbnail components with
 * selection controls, a page range input, a back button, and a resolution dropdown.
 */
export function PageSelector({
  pages,
  totalPages,
  onPageChange,
  onSelectAll,
  onDeselectAll,
  onSetPages,
  onGoHome,
  format,
  onFormatChange,
  ppiIndex,
  onPpiChange,
  scaleIndex,
  onScaleChange,
}: PageSelectorProps) {
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  const selectedCount = pages.filter((p) => p.selected).length

  const applyRange = useCallback(() => {
    if (!rangeInput.trim()) {
      setRangeError(null)
      return
    }

    const pageNumbers = new Set<number>()
    const parts = rangeInput.split(',')

    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue

      const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10)
        const end = parseInt(rangeMatch[2], 10)
        if (start < 1 || end > totalPages || start > end) {
          setRangeError(`Invalid range: ${trimmed}. Pages must be between 1 and ${totalPages}.`)
          return
        }
        for (let i = start; i <= end; i++) {
          pageNumbers.add(i)
        }
      } else {
        const num = parseInt(trimmed, 10)
        if (isNaN(num) || num < 1 || num > totalPages) {
          setRangeError(`Invalid page: ${trimmed}. Pages must be between 1 and ${totalPages}.`)
          return
        }
        pageNumbers.add(num)
      }
    }

    setRangeError(null)
    onSetPages((prev) =>
      prev.map((p) => ({ ...p, selected: pageNumbers.has(p.pageNumber) }))
    )
  }, [rangeInput, totalPages, onSetPages])

  const handleRangeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyRange()
  }, [applyRange])

  const selectedOption = PPI_OPTIONS[ppiIndex]
  const contentScale = TARGET_INCHES_PER_FOOT / SCALE_OPTIONS[scaleIndex].inchesPerFoot

  /** Estimated MB per page based on actual page dimensions, scale, and PPI */
  const estimate = useMemo(() => {
    if (pages.length === 0) return null
    const avgW = pages.reduce((s, p) => s + p.widthInches, 0) / pages.length
    const avgH = pages.reduce((s, p) => s + p.heightInches, 0) / pages.length
    const pixels = (avgW * contentScale * selectedOption.ppi) * (avgH * contentScale * selectedOption.ppi)
    const rawBytes = pixels * 4 // RGBA
    const minMb = (rawBytes * PNG_COMPRESSION_RATIO_MIN) / (1024 * 1024)
    const maxMb = (rawBytes * PNG_COMPRESSION_RATIO_MAX) / (1024 * 1024)
    return { min: Math.max(1, Math.round(minMb)), max: Math.max(1, Math.round(maxMb)) }
  }, [pages, contentScale, selectedOption.ppi])

  return (
    <div>
      {/* Header row — sticky, single line, never wraps */}
      <div className="sticky top-0 z-10 bg-neutral-900 px-4 pt-4 pb-3 flex items-center gap-3 min-w-0">
        {/* Left group */}
        <button
          type="button"
          aria-label="Go back to file selection"
          className="shrink-0 px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          onClick={onGoHome}
        >
          &larr; New File
        </button>

        <span className="shrink-0 text-sm text-neutral-400">
          {selectedCount} of {totalPages} selected
        </span>

        {/* Select All — 4 filled quadrants */}
        <button
          type="button"
          aria-label="Select all pages"
          title="Select All"
          className="shrink-0 p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          onClick={onSelectAll}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" className="text-neutral-200">
            <rect x="1" y="1" width="6" height="6" fill="currentColor" rx="1" />
            <rect x="9" y="1" width="6" height="6" fill="currentColor" rx="1" />
            <rect x="1" y="9" width="6" height="6" fill="currentColor" rx="1" />
            <rect x="9" y="9" width="6" height="6" fill="currentColor" rx="1" />
          </svg>
        </button>

        {/* Deselect All — 4 outlined quadrants */}
        <button
          type="button"
          aria-label="Deselect all pages"
          title="Deselect All"
          className="shrink-0 p-1.5 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          onClick={onDeselectAll}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" className="text-neutral-200">
            <rect x="1.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
            <rect x="9.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
            <rect x="1.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
            <rect x="9.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" rx="0.5" />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            onBlur={applyRange}
            onKeyDown={handleRangeKeyDown}
            placeholder="e.g. 1-5, 8, 12"
            aria-label="Page range selection"
            className="px-2 py-1 text-sm bg-neutral-700 rounded text-neutral-200 placeholder-neutral-500
              focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
          />
          {rangeError && (
            <span className="text-xs text-red-400 whitespace-nowrap">{rangeError}</span>
          )}
        </div>

        {/* Spacer pushes dropdowns to the right */}
        <div className="flex-1" />

        {/* Right group — scale + format + resolution, always on same line */}
        <div className="shrink-0 flex items-center gap-3">
          {/* Source scale dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="scale-select" className="text-sm text-neutral-400">
              Source Scale:
            </label>
            <select
              id="scale-select"
              aria-label="Source PDF scale"
              value={scaleIndex}
              onChange={(e) => onScaleChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-neutral-700 rounded text-neutral-200
                focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {SCALE_OPTIONS.map((option, index) => (
                <option key={option.inchesPerFoot} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Format dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="format-select" className="text-sm text-neutral-400">
              Format:
            </label>
            <select
              id="format-select"
              aria-label="Export format"
              value={format}
              onChange={(e) => onFormatChange(e.target.value as ExportFormat)}
              className="px-3 py-1.5 text-sm bg-neutral-700 rounded text-neutral-200
                focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
            </select>
          </div>

          {/* Resolution dropdown — only shown for PNG */}
          {format === 'png' && (
            <div className="flex items-center gap-2">
              <label htmlFor="ppi-select" className="text-sm text-neutral-400">
                Resolution:
              </label>
              <select
                id="ppi-select"
                aria-label="Export resolution"
                value={ppiIndex}
                onChange={(e) => onPpiChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm bg-neutral-700 rounded text-neutral-200
                  focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {PPI_OPTIONS.map((option, index) => (
                  <option key={option.ppi} value={index}>
                    {option.label} ({option.ppi} PPI)
                  </option>
                ))}
              </select>
              {estimate && (
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  ~{estimate.min}&ndash;{estimate.max} MB/page
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail grid — 2 cols mobile, 3 tablet, 3-4 desktop (bigger thumbs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 pb-24">
        {pages.map((page) => (
          <PageThumbnail
            key={page.pageNumber}
            page={page}
            onChange={onPageChange}
          />
        ))}
      </div>
    </div>
  )
}
