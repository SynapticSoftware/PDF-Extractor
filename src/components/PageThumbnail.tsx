import { useState, useCallback, useRef } from 'react'
import { sanitizePageName } from '../utils/pageNaming'
import type { PdfPage } from '../types'
import type { AppError } from '../types'

interface PageThumbnailProps {
  page: PdfPage
  onChange: (updated: PdfPage) => void
}

/**
 * Renders a single page thumbnail with selection checkbox and editable name.
 * Full card is clickable to toggle selection.
 */
export function PageThumbnail({ page, onChange }: PageThumbnailProps) {
  const [nameError, setNameError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleSelection = useCallback(() => {
    onChange({ ...page, selected: !page.selected })
  }, [page, onChange])

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onChange({ ...page, selected: e.target.checked })
  }, [page, onChange])

  const handleNameFocus = useCallback(() => {
    inputRef.current?.select()
  }, [])

  const handleNameCommit = useCallback(() => {
    const raw = inputRef.current?.value ?? ''
    setNameError(null)
    try {
      const sanitized = sanitizePageName(raw)
      onChange({ ...page, customName: sanitized })
    } catch (e) {
      const appError = e as AppError
      setNameError(appError.userMessage)
    }
  }, [page, onChange])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameCommit()
      inputRef.current?.blur()
    }
  }, [handleNameCommit])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Page ${page.pageNumber}: ${page.customName}. ${page.selected ? 'Selected' : 'Not selected'}`}
      className={`
        relative rounded-lg bg-neutral-800 p-2 cursor-pointer
        transition-all duration-150
        ${page.selected ? 'ring-2 ring-blue-500' : 'ring-0'}
      `}
      onClick={toggleSelection}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSelection() }}
    >
      {/* Checkbox overlay */}
      <input
        type="checkbox"
        checked={page.selected}
        onChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select page ${page.pageNumber}`}
        className="absolute top-3 left-3 w-4 h-4 accent-blue-500 cursor-pointer"
      />

      {/* Thumbnail image */}
      <img
        src={page.thumbnail}
        alt={`Page ${page.pageNumber} thumbnail`}
        className="w-full rounded"
        draggable={false}
      />

      {/* Editable name field */}
      <input
        ref={inputRef}
        type="text"
        value={page.customName}
        placeholder={page.detectedName ?? ''}
        onChange={(e) => onChange({ ...page, customName: e.target.value, selected: true })}
        onFocus={handleNameFocus}
        onBlur={handleNameCommit}
        onKeyDown={handleNameKeyDown}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Name for page ${page.pageNumber}`}
        className="mt-2 w-full px-2 py-1 bg-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500
          focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {nameError && (
        <p className="mt-1 text-xs text-red-400">{nameError}</p>
      )}
    </div>
  )
}
