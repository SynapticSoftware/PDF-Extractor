import type { ExportFormat } from '../types'

interface ExportPanelProps {
  selectedCount: number
  format: ExportFormat
  onExport: () => void
}

/**
 * Sticky bottom panel with the export button.
 * Format and resolution are selected via dropdowns in PageSelector's header.
 */
export function ExportPanel({ selectedCount, format, onExport }: ExportPanelProps) {
  const formatLabel = format.toUpperCase()

  return (
    <div className="sticky bottom-0 bg-neutral-800 border-t border-neutral-700 p-4">
      <button
        type="button"
        disabled={selectedCount === 0}
        aria-label={`Export ${selectedCount} pages as ${formatLabel}`}
        className={`
          w-full py-3 rounded-lg text-sm font-medium transition-colors
          ${selectedCount > 0
            ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white cursor-pointer'
            : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'}
        `}
        onClick={onExport}
      >
        Export {selectedCount} Page{selectedCount !== 1 ? 's' : ''} as {formatLabel}
      </button>
    </div>
  )
}
