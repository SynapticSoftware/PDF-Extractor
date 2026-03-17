import { useState, useRef, useCallback } from 'react'

interface DropZoneProps {
  onFileSelected: (file: File) => void
  onError: (message: string) => void
}

/**
 * Large centered drop target for PDF files.
 * Validates MIME type on drop, shows file size on drag-over.
 */
export function DropZone({ onFileSelected, onError }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragFileSize, setDragFileSize] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
    if (e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0]
      if (item.kind === 'file') {
        // File size is not accessible during dragover in all browsers
        setDragFileSize(null)
      }
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragFileSize(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragFileSize(null)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      onError('Please drop a PDF file.')
      return
    }

    onFileSelected(file)
  }, [onFileSelected, onError])

  const handleBrowse = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      onError('Please select a PDF file.')
      return
    }

    onFileSelected(file)
  }, [onFileSelected, onError])

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-8">
      <div className="text-center max-w-xl">
        <h1 className="text-3xl font-bold text-white mb-3">Super-Useful PDF to Visio Machine</h1>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Convert architectural PDF plan sets into correctly-scaled PNG or SVG images
          ready to drop into Visio. Select the pages you need, pick your resolution and
          source scale, and export — each file is sized to print at 36" &times; 24" with
          embedded metadata so Visio places it at the right physical dimensions.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a PDF file here or click to browse"
        className={`
          w-full max-w-lg p-12 rounded-xl border-2 border-dashed text-center
          transition-all duration-150 cursor-pointer
          ${isDragOver
            ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-500/10'
            : 'border-neutral-600 hover:border-neutral-400 bg-neutral-800'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowse}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBrowse() }}
      >
        <p className="text-lg text-neutral-300 mb-2">
          Drop a PDF file here
        </p>
        <p className="text-sm text-neutral-500 mb-4">
          or click to browse
        </p>
        {dragFileSize !== null && (
          <p className="text-sm text-neutral-400">
            {formatSize(dragFileSize)}
          </p>
        )}
        <button
          type="button"
          aria-label="Browse for PDF file"
          className="mt-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
          onClick={(e) => { e.stopPropagation(); handleBrowse() }}
        >
          Browse
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <ol className="max-w-md text-sm text-neutral-500 space-y-1 list-decimal list-inside">
        <li>Upload a PDF plan set</li>
        <li>Select the pages you want to export</li>
        <li>Choose your format (PNG or SVG), resolution, and source scale</li>
        <li>Click Export and pick a save folder</li>
        <li>Insert the exported files into Visio — they'll be correctly sized</li>
      </ol>
    </div>
  )
}
