// Output canvas dimensions in inches — all pixel math derives from these two values
export const OUTPUT_WIDTH_INCHES = 36
export const OUTPUT_HEIGHT_INCHES = 24

// Default PPI selection index — points to PPI_OPTIONS[3] = 600 PPI
export const DEFAULT_PPI_INDEX = 3

// All PPI options. Add or remove options here only — nothing else needs updating.
export const PPI_OPTIONS = [
  { label: 'Screen',        ppi: 72,  estimatedMbMin: 2,   estimatedMbMax: 4   },
  { label: 'Digital Share', ppi: 150, estimatedMbMin: 8,   estimatedMbMax: 15  },
  { label: 'Print Ready',   ppi: 300, estimatedMbMin: 30,  estimatedMbMax: 60  },
  { label: 'Max Quality',   ppi: 600, estimatedMbMin: 120, estimatedMbMax: 250 },
] as const

// Thumbnail preview width in pixels — used only for UI previews, never for export
export const THUMBNAIL_PREVIEW_WIDTH_PX = 150

// Maximum characters allowed in a custom page name
export const PAGE_NAME_MAX_LENGTH = 40

// Milliseconds before ErrorBanner auto-dismisses
export const ERROR_BANNER_TIMEOUT_MS = 8000

// Tauri store key for persisting the last used save folder
export const LAST_SAVE_FOLDER_KEY = 'lastSaveFolder'

// Sheet title detection — valid title candidates must fall within this character range
export const SHEET_TITLE_MIN_LENGTH = 2
export const SHEET_TITLE_MAX_LENGTH = 10

// Appended to the source PDF filename when naming the ZIP export
export const ZIP_FILENAME_SUFFIX = '_plans.zip'
