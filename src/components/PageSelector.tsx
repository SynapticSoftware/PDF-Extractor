import { useState, useCallback } from 'react'
import { PageThumbnail } from './PageThumbnail'
import type { PdfPage } from '../types'

interface PageSelectorProps {
  pages: PdfPage[]
  totalPages: number
  onPageChange: (updated: PdfPage) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSetPages: (updater: (prev: PdfPage[]) => PdfPage[]) => void
}

/**
 * Renders a responsive grid of PageThumbnail components with
 * selection controls and a page range input.
 */
export function PageSelector({
  pages,
  totalPages,
  onPageChange,
  onSelectAll,
  onDeselectAll,
  onSetPages,
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

  return (
    <div className="p-4 pb-32">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-neutral-400">
          {selectedCount} of {totalPages} pages selected
        </span>

        <button
          type="button"
          aria-label="Select all pages"
          className="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          onClick={onSelectAll}
        >
          Select All
        </button>
        <button
          type="button"
          aria-label="Deselect all pages"
          className="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
          onClick={onDeselectAll}
        >
          Deselect All
        </button>

        <div className="flex items-center gap-2">
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
            <span className="text-xs text-red-400">{rangeError}</span>
          )}
        </div>
      </div>

      {/* Thumbnail grid — 2 cols mobile, 3 tablet, 4-5 desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
