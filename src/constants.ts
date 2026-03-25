// Output canvas dimensions in inches — all pixel math derives from these two values
export const OUTPUT_WIDTH_INCHES = 36
export const OUTPUT_HEIGHT_INCHES = 24

// Default PPI selection index — points to PPI_OPTIONS[0] = 300 PPI
export const DEFAULT_PPI_INDEX = 0

// All PPI options. Add or remove options here only — nothing else needs updating.
export const PPI_OPTIONS = [
  { label: 'Print Ready',  ppi: 300 },
  { label: 'Max Quality',  ppi: 450 },
] as const

// PNG compression ratio range for architectural plan-set pages (mostly white, line art).
// Actual bytes = raw pixels * bytes-per-pixel * ratio. Used for file size estimates only.
export const PNG_COMPRESSION_RATIO_MIN = 0.02
export const PNG_COMPRESSION_RATIO_MAX = 0.08

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

// Architectural scale options.
// Content scale factor = OUTPUT / SOURCE inches-per-foot.
export const DEFAULT_SCALE_INDEX = 0
export const DEFAULT_OUTPUT_SCALE_INDEX = 4

// Source scales — typical plan-set drawing scales
export const SOURCE_SCALE_OPTIONS = [
  { label: '1/4" = 1\'',   inchesPerFoot: 0.25    },
  { label: '3/16" = 1\'',  inchesPerFoot: 0.1875  },
  { label: '1/8" = 1\'',   inchesPerFoot: 0.125   },
  { label: '3/32" = 1\'',  inchesPerFoot: 0.09375 },
  { label: '1/16" = 1\'',  inchesPerFoot: 0.0625  },
] as const

// Output scales — includes larger detail scales up to 1"=1'
export const OUTPUT_SCALE_OPTIONS = [
  { label: '1" = 1\'',     inchesPerFoot: 1       },
  { label: '3/4" = 1\'',   inchesPerFoot: 0.75    },
  { label: '1/2" = 1\'',   inchesPerFoot: 0.5     },
  { label: '3/8" = 1\'',   inchesPerFoot: 0.375   },
  { label: '1/4" = 1\'',   inchesPerFoot: 0.25    },
  { label: '3/16" = 1\'',  inchesPerFoot: 0.1875  },
  { label: '1/8" = 1\'',   inchesPerFoot: 0.125   },
  { label: '3/32" = 1\'',  inchesPerFoot: 0.09375 },
  { label: '1/16" = 1\'',  inchesPerFoot: 0.0625  },
] as const
