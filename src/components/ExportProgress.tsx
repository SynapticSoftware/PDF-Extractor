interface ExportProgressProps {
  progress: string
  total: number
  onCancel: () => void
}

/**
 * Full-screen overlay showing export progress with a cancel button.
 * Progress bar width is driven by parsing the current/total from the progress string.
 */
export function ExportProgress({ progress, total, onCancel }: ExportProgressProps) {
  // Parse "Exporting page X of Y" to compute percentage
  const match = progress.match(/(\d+)\s+of\s+(\d+)/)
  const current = match ? parseInt(match[1], 10) : 0
  const progressTotal = match ? parseInt(match[2], 10) : total
  const percent = progressTotal > 0 ? (current / progressTotal) * 100 : 0

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      role="dialog"
      aria-label="Export progress"
    >
      <div className="bg-neutral-800 rounded-xl p-6 w-full max-w-md mx-4">
        {/* Progress bar */}
        <div
          className="w-full h-2 bg-neutral-700 rounded-full mb-4 overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Status message */}
        <p className="text-sm text-neutral-300 mb-4 text-center">
          {progress}
        </p>

        {/* Cancel button */}
        <button
          type="button"
          aria-label="Cancel export"
          className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm text-neutral-300 transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
