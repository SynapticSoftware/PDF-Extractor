/**
 * Typed error class — always use this, never throw raw Error objects.
 * userMessage is shown in the ErrorBanner.
 * debugContext is logged to console only, never shown to the user.
 */
export class AppError extends Error {
  constructor(
    public userMessage: string,
    public debugContext: string
  ) {
    super(userMessage)
    this.name = 'AppError'
  }
}

/** Represents one page from the loaded PDF */
export interface PdfPage {
  pageNumber: number
  selected: boolean
  customName: string
  detectedName: string | null
  thumbnail: string
  widthInches: number
  heightInches: number
}

/** Export format — SVG embeds a raster at fixed 150 PPI; PNG uses user-selected PPI */
export type ExportFormat = 'svg' | 'png'

/** Options passed to the export pipeline */
export interface ExportOptions {
  ppi: number
  pages: PdfPage[]
}

/** Top-level app state shape (managed in App.tsx via useState) */
export interface AppState {
  file: File | null
  totalPages: number
  pages: PdfPage[]
  isLoading: boolean
  loadingMessage: string
  error: string | null
}
