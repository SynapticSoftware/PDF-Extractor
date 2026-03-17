// Output canvas dimensions in inches — all pixel math derives from these two values
export const OUTPUT_WIDTH_INCHES = 36
export const OUTPUT_HEIGHT_INCHES = 24

// Default PPI selection index — points to PPI_OPTIONS[0] = 300 PPI
export const DEFAULT_PPI_INDEX = 0

// All PPI options. Add or remove options here only — nothing else needs updating.
// Size estimates assume architectural plan-set pages (mostly white, line art) with PNG compression.
export const PPI_OPTIONS = [
  { label: 'Print Ready',  ppi: 300, estimatedMbMin: 2,  estimatedMbMax: 8  },
  { label: 'Max Quality',  ppi: 450, estimatedMbMin: 5,  estimatedMbMax: 15 },
] as const

// Thumbnail preview width in pixels — used only for UI previews, never for export
export const THUMBNAIL_PREVIEW_WIDTH_PX = 375

// Maximum characters allowed in a custom page name
export const PAGE_NAME_MAX_LENGTH = 40

// Milliseconds before ErrorBanner auto-dismisses
export const ERROR_BANNER_TIMEOUT_MS = 8000

// Tauri store key for persisting the last used save folder
export const LAST_SAVE_FOLDER_KEY = 'lastSaveFolder'

// Sheet title detection — valid title candidates must fall within this character range
export const SHEET_TITLE_MIN_LENGTH = 2
export const SHEET_TITLE_MAX_LENGTH = 10

// Appended to the source PDF filename when suggesting an export folder name
export const EXPORT_FOLDER_SUFFIX = '_plans'

// Architectural scale options for the source PDF.
// The target Visio page is always 1/4":1' (TARGET_INCHES_PER_FOOT).
// Content scale factor = TARGET / SOURCE inches-per-foot.
export const TARGET_INCHES_PER_FOOT = 0.25

export const DEFAULT_SCALE_INDEX = 0

export const SCALE_OPTIONS = [
  { label: '1/4" = 1\'',   inchesPerFoot: 0.25    },
  { label: '3/16" = 1\'',  inchesPerFoot: 0.1875  },
  { label: '1/8" = 1\'',   inchesPerFoot: 0.125   },
  { label: '3/32" = 1\'',  inchesPerFoot: 0.09375 },
  { label: '1/16" = 1\'',  inchesPerFoot: 0.0625  },
] as const
