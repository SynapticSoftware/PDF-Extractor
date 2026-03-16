import { useState } from 'react'
import {
  PPI_OPTIONS,
  DEFAULT_PPI_INDEX,
  OUTPUT_WIDTH_INCHES,
  OUTPUT_HEIGHT_INCHES,
} from '../constants'

interface ExportPanelProps {
  selectedCount: number
  onExport: (ppi: number) => void
}

/**
 * Sticky bottom panel with PPI resolution selector and export button.
 * All values are derived from constants — no hardcoded labels, sizes, or estimates.
 */
export function ExportPanel({ selectedCount, onExport }: ExportPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_PPI_INDEX)
  const selectedOption = PPI_OPTIONS[selectedIndex]

  return (
    <div className="sticky bottom-0 bg-neutral-800 border-t border-neutral-700 p-4">
      {/* Resolution selector */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PPI_OPTIONS.map((option, index) => {
          const w = OUTPUT_WIDTH_INCHES * option.ppi
          const h = OUTPUT_HEIGHT_INCHES * option.ppi
          const isActive = index === selectedIndex

          return (
            <button
              key={option.ppi}
              type="button"
              aria-label={`${option.label}: ${w} by ${h} pixels, estimated ${option.estimatedMbMin} to ${option.estimatedMbMax} megabytes`}
              className={`
                flex-1 min-w-[140px] px-3 py-2 rounded-lg text-left text-sm transition-colors
                ${isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}
              `}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="font-medium block">{option.label}</span>
              <span className="text-xs opacity-80 block">
                {w.toLocaleString()} &times; {h.toLocaleString()} px
              </span>
              <span className="text-xs opacity-60 block">
                ~{option.estimatedMbMin}&ndash;{option.estimatedMbMax} MB
              </span>
            </button>
          )
        })}
      </div>

      {/* Export button */}
      <button
        type="button"
        disabled={selectedCount === 0}
        aria-label={`Export ${selectedCount} pages as ZIP at ${selectedOption.ppi} PPI`}
        className={`
          w-full py-3 rounded-lg text-sm font-medium transition-colors
          ${selectedCount > 0
            ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white cursor-pointer'
            : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'}
        `}
        onClick={() => onExport(selectedOption.ppi)}
      >
        Export {selectedCount} Page{selectedCount !== 1 ? 's' : ''} as ZIP
      </button>
    </div>
  )
}
