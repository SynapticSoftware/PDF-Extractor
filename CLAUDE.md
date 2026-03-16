# PDF Plan-Set Converter — Claude Code Instructions

---

## AGENTS.md

### App Purpose
Convert selected pages from large architectural PDF plan-sets into standardized 36"×24" PNG
files at user-selected PPI. Packaged as a Tauri desktop app (Win/Mac/Linux) and a PWA
(Web/iPad) from one codebase.

### Stack
- React 18 + Tailwind CSS (UI)
- pdfjs-dist (PDF parsing + canvas rendering — runs fully offline)
- JSZip (bundle exports into a single ZIP)
- Tauri v2 (desktop shell, native file dialogs, last-folder memory)
- Vite (build tool)
- GitHub Actions + tauri-apps/tauri-action (CI/CD)

---

### Principles

#### DRY (Don't Repeat Yourself)
Shared logic lives in /src/utils or /src/hooks. If the same logic appears twice, it belongs
in a utility. Components never duplicate business logic.

#### SOLID
- Single Responsibility: each component, hook, and utility does one thing only
- Open/Closed: extend behavior by adding utilities or hooks, not by modifying existing ones
- Liskov Substitution: hooks and utils are interchangeable if they share a type contract
- Interface Segregation: types in /src/types.ts are small and specific — no bloated interfaces
- Dependency Inversion: components depend on hook interfaces, not on direct API calls

#### KISS (Keep It Simple, Stupid)
Prefer the simplest solution that works. If a function needs a lengthy comment to explain
what it does, it needs to be simplified first.

#### YAGNI (You Aren't Gonna Need It)
Do not build for hypothetical future requirements. No placeholder functions, no "we might
need this later" abstractions, no unused exports.

#### Mobile-First
All layouts start at small screen and scale up with Tailwind sm/md/lg breakpoints.

#### Minimal Dependencies
Do not add a library if native browser APIs or canvas can do it.

#### Error Handling — No Silent Fallbacks
- Do NOT use fallback chains (catch → try something else → try another thing)
- Every async operation that can fail MUST throw a typed AppError
- All errors are caught at the hook level, never in components
- User-facing message: friendly, actionable (e.g. "Could not read PDF. Is the file corrupted?")
- Dev-facing log: console.error with full error object and context
- Pattern to follow in every utility:

  ```ts
  if (!expectedValue) {
    const err = new AppError('USER_FRIENDLY_MESSAGE', 'debug context here')
    console.error('[functionName]', err)
    throw err
  }
  ```

#### Comments
Every exported function gets a JSDoc block. Non-obvious logic gets an inline comment
explaining WHY, not WHAT.

#### Accessibility
All interactive elements must be keyboard-navigable and have aria labels.

#### No Dead Code
No placeholder functions, unused imports, or TODO stubs in committed code.

---

### File Structure
```
/src
  /components       — React UI components (PascalCase filenames)
  /hooks            — Custom React hooks (use-prefixed)
  /utils            — Pure functions: PDF parsing, canvas rendering, ZIP creation
  /constants.ts     — ALL numeric values, labels, config — single source of truth
  /types.ts         — All TypeScript interfaces, types, and AppError class
/src-tauri          — Tauri config and Rust shell (minimal, do not over-customize)
/public             — Service worker, manifest.json, icons
/.github/workflows  — CI/CD pipeline
```

### State Management
React useState + useContext only. No Redux, no Zustand. Keep state local where possible;
lift to context only when 2+ components need it.

### Naming Conventions
- Components:  PascalCase        (PageThumbnail.tsx)
- Hooks:       camelCase, use-   (usePdfLoader.ts)
- Utilities:   camelCase         (extractSheetTitle.ts)
- Files:       kebab-case        (except components and hooks)
- Constants:   SCREAMING_SNAKE_CASE

### Platform-Aware File Saving
- Desktop (Tauri): use Tauri dialog API, remember last folder via Tauri store plugin
- Web/iPad: use File System Access API where available, fallback to anchor download
- All save logic lives in /src/utils/fileSaver.ts — components never call platform APIs directly

---

## Project Setup Instructions

Create a new Tauri + React + TypeScript project:
```
npm create tauri-app@latest -- --template react-ts
```

Install dependencies:
```
npm install pdfjs-dist jszip
npm install -D tailwindcss @tailwindcss/vite
```

Install Tauri plugins:
```
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-store
```

- Initialize Tailwind with the Vite plugin (not PostCSS).
- Set pdf.js worker source to the bundled worker in `pdfjs-dist/build/pdf.worker.min.mjs`.
- Configure Vite to inline the worker using a `?url` import.

---

## Constants — `/src/constants.ts`

This is the **single source of truth** for all configurable values. No numeric literals,
labels, or thresholds exist anywhere else in the codebase. To change any value, edit here only.

```ts
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
```

---

## Types — `/src/types.ts`

```ts
// Typed error class — always use this, never throw raw Error objects.
// userMessage is shown in the ErrorBanner.
// debugContext is logged to console only, never shown to the user.
export class AppError extends Error {
  constructor(
    public userMessage: string,
    public debugContext: string
  ) {
    super(userMessage)
    this.name = 'AppError'
  }
}

// Represents one page from the loaded PDF
export interface PdfPage {
  pageNumber: number
  selected: boolean
  customName: string          // editable by user
  detectedName: string | null // extracted from PDF text layer, null if not found
  thumbnail: string           // base64 data URL rendered at THUMBNAIL_PREVIEW_WIDTH_PX
}

// Options passed to the export pipeline
export interface ExportOptions {
  ppi: number
  pages: PdfPage[]
}

// Top-level app state shape (managed in App.tsx via useState)
export interface AppState {
  file: File | null
  totalPages: number
  pages: PdfPage[]
  isLoading: boolean
  loadingMessage: string
  error: string | null
}
```

---

## Utility Functions

### `/src/utils/pdfLoader.ts`

```
loadPdf(file: File): Promise<PDFDocumentProxy>
  - Reads the file as an ArrayBuffer
  - Loads via pdfjs.getDocument({ data: arrayBuffer })
  - Throws AppError if the file cannot be read or is not a valid PDF
  - Returns the pdf document proxy for use throughout the session
```

### `/src/utils/thumbnailRenderer.ts`

```
renderThumbnail(page: PDFPageProxy): Promise<string>
  - Renders the page to an offscreen canvas at THUMBNAIL_PREVIEW_WIDTH_PX wide
    (height calculated proportionally to maintain aspect ratio)
  - Returns canvas content as a base64 PNG data URL
  - Used only for UI preview thumbnails — never called during export
  - Throws AppError if canvas rendering fails
```

### `/src/utils/extractSheetTitle.ts`

```
extractSheetTitle(page: PDFPageProxy): Promise<string | null>
  - Retrieves the text content from the PDF page's text layer
  - Searches for common architectural title block patterns:
      - Standalone short strings between SHEET_TITLE_MIN_LENGTH and SHEET_TITLE_MAX_LENGTH
        that match sheet number formats (e.g. "A1.0", "S-101", "E2")
      - Strings appearing near the keywords "Sheet", "Drawing No", or "Sheet No"
  - Returns the best candidate string, or null if no confident match is found
  - Does NOT throw on null — the caller (pageNaming.ts) handles the fallback
  - Throws AppError only if the text layer itself cannot be accessed
```

### `/src/utils/pageNaming.ts`

```
generateDefaultName(detectedName: string | null, pageNumber: number): string
  - If detectedName is not null, sanitizes it:
      - Trims whitespace
      - Replaces spaces with underscores
      - Removes characters not in [A-Za-z0-9_-]
      - Truncates to PAGE_NAME_MAX_LENGTH
  - If detectedName is null, returns "Page_##" where ## is the zero-padded page number
  - This is a pure function — no async, no side effects, no errors thrown

sanitizePageName(name: string): string
  - Applies the same sanitization rules as above
  - Used when the user edits a name manually in PageThumbnail
  - Throws AppError if the result after sanitization is an empty string
```

### `/src/utils/pageExporter.ts`

```
exportPageToPng(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  ppi: number
): Promise<Blob>
  - Loads the specific page from pdfDoc
  - Calculates output canvas dimensions from constants:
      outputWidth  = OUTPUT_WIDTH_INCHES  * ppi
      outputHeight = OUTPUT_HEIGHT_INCHES * ppi
  - Gets the page's natural viewport at scale 1
  - Calculates scale factor so the PDF page fills the output canvas width exactly
  - If the PDF page aspect ratio does not match 36:24, centers it and letterboxes
    with a white background — does not stretch or distort
  - Renders to an offscreen canvas at the calculated scale
  - Returns the canvas content as a PNG Blob via canvas.toBlob()
  - Throws AppError if the page cannot be loaded or the canvas fails to render
  - NOTE: This is the most memory-intensive function. It MUST be called sequentially,
    never in parallel, to avoid memory exhaustion on large PDFs.
```

### `/src/utils/zipBuilder.ts`

```
buildZip(pages: Array<{ name: string; blob: Blob }>): Promise<Blob>
  - Creates a new JSZip instance
  - Adds each blob as "{name}.png"
  - Generates and returns the zip archive as a Blob
  - Throws AppError if the zip cannot be generated
```

### `/src/utils/fileSaver.ts`

```
saveFile(blob: Blob, suggestedName: string): Promise<void>
  - Detects runtime environment by checking window.__TAURI__

  Tauri (desktop) path:
    1. Read last saved folder from Tauri store using LAST_SAVE_FOLDER_KEY
    2. Open Tauri save dialog, defaulting to last folder + suggestedName
    3. If user cancels the dialog, throw AppError with a user-friendly "cancelled" message
    4. Write the blob to the selected path
    5. Update LAST_SAVE_FOLDER_KEY in the Tauri store with the new folder

  Browser path:
    1. Attempt window.showSaveFilePicker() (File System Access API)
    2. If the API is unavailable OR the user cancels, throw AppError — do NOT silently
       fall back to anchor download without informing the user
    3. Exception: if the browser does not support showSaveFilePicker at all (feature
       detection returns false), use the anchor download fallback automatically and
       log a debug note via console.info (this is not an error — it is expected on iOS)

  Throws AppError for all failure cases with appropriate user-facing messages.
```

---

## Hooks

### `/src/hooks/usePdfLoader.ts`

```
Manages the full PDF load and page-initialization lifecycle.

  - Accepts a File object
  - Sets isLoading: true and loadingMessage: "Loading PDF…"
  - Calls loadPdf() to get the PDFDocumentProxy
  - Iterates every page, for each:
      - Calls renderThumbnail()
      - Calls extractSheetTitle()
      - Calls generateDefaultName() with the detected title and page number
      - Builds a PdfPage object with selected: false and customName pre-filled
  - Updates loadingMessage to "Loading page X of Y…" during iteration
  - Sets isLoading: false when complete
  - Returns { pages, totalPages, pdfDoc, isLoading, loadingMessage, error }
  - ALL errors from utilities are caught here, converted to error state string,
    and never re-thrown to the component layer
```

### `/src/hooks/useExport.ts`

```
Manages the full export lifecycle.

  - Accepts: pdfDoc (PDFDocumentProxy), selectedPages (PdfPage[]), ppi (number)
  - Validates that selectedPages is not empty — throws AppError if called with none selected
  - Sets isExporting: true
  - Iterates selectedPages sequentially (not in parallel):
      - Updates progress: "Exporting page X of Y — [page customName]"
      - Calls exportPageToPng() for the page
      - Checks cancellation flag between each page — stops cleanly if cancelled
  - Calls buildZip() with all resulting blobs and names
  - Constructs suggested ZIP filename: originalPdfName (sans extension) + ZIP_FILENAME_SUFFIX
  - Calls saveFile() with the zip blob and suggested filename
  - Sets isExporting: false on completion or error
  - Returns { isExporting, progress, error, startExport, cancelExport }
  - ALL errors caught here, surfaced via error state, never re-thrown to components
```

---

## Components

### `App.tsx`
Root component. Holds top-level AppState. Renders a single-page, three-step flow:
```
Step 1 — no file loaded:         render <DropZone />
Step 2 — file loaded, not exporting: render <PageSelector /> + <ExportPanel />
Step 3 — exporting in progress:  render <ExportProgress />
Always render <ErrorBanner /> if error state is non-null.
```

### `DropZone.tsx`
```
- Large centered drop target, accepts .pdf files only (validate MIME type on drop)
- "Browse" button opens a hidden file input
- Drag-over state changes border style via Tailwind ring/border utilities
- Displays the file size of a dragged file before drop confirmation
- Calls onFileSelected(file: File) prop on valid file selection
- Throws AppError (surfaced via onError prop) if a non-PDF file is dropped
```

### `PageSelector.tsx`
```
- Renders a responsive grid of <PageThumbnail /> components
    2 columns on mobile, 3 on tablet (sm:), 4-5 on desktop (lg:)
- Header row contains:
    - "X of Y pages selected" count (updates reactively)
    - "Select All" and "Deselect All" buttons
    - Page range input field (e.g. "1-5, 8, 12")
        - Parses comma-separated ranges on Enter or blur
        - Validates all values are within 1–totalPages
        - Shows inline error text if input is invalid
        - Does NOT throw AppError — range errors are inline UI only
- Bottom padding ensures ExportPanel never overlaps thumbnails
```

### `PageThumbnail.tsx`
```
Props: page: PdfPage, onChange: (updated: PdfPage) => void

- Renders the thumbnail image (page.thumbnail base64 URL)
- Checkbox overlay in the top-left corner toggles page.selected
- Editable text field below the thumbnail:
    - Displays page.customName
    - Uses page.detectedName as placeholder text if customName is empty
    - On focus: selects all text for easy full replacement
    - On blur or Enter: calls sanitizePageName(), updates via onChange()
    - If sanitizePageName throws AppError, shows inline error below the field
- Selected state: Tailwind ring-2 ring-blue-500 highlight
- Selection ring transition: transition-all duration-150
- Full card is also clickable to toggle selection (not just the checkbox)
```

### `ExportPanel.tsx`
```
- Sticky to the bottom of the viewport on all screen sizes
- Contains:
    1. Resolution selector — segmented button group, one button per PPI_OPTIONS entry
       Each button displays:
         - Option label (e.g. "Print Ready")
         - Output pixel dimensions: "{W} × {H} px"  (calculated from OUTPUT_*_INCHES * ppi)
         - File size estimate: "~{min}–{max} MB"  (from PPI_OPTIONS constants)
       Default selected: PPI_OPTIONS[DEFAULT_PPI_INDEX]
    2. "Export X Pages as ZIP" primary button
       - Disabled and visually dimmed when 0 pages are selected
       - Displays the count of currently selected pages
       - Calls onExport(ppi: number) prop when clicked
- All values derived from constants — no hardcoded labels, sizes, or estimates
```

### `ExportProgress.tsx`
```
- Full-screen overlay (fixed inset-0) with semi-transparent backdrop
- Centered card containing:
    - Progress bar (width driven by current/total page count)
    - Status message: "Exporting page X of Y — [customName]"
    - "Cancel" button — calls onCancel() prop
      Cancellation is checked between pages in useExport, not mid-render
```

### `ErrorBanner.tsx`
```
- Fixed to the top of the viewport, full width, red background
- Displays the error message string
- "×" dismiss button calls onDismiss() prop
- Auto-dismisses after ERROR_BANNER_TIMEOUT_MS milliseconds
- Resets the auto-dismiss timer if a new error replaces the current one
```

---

## CI/CD — `.github/workflows/build.yml`

```yaml
# Triggers: every push to main, and every version tag (v*)
# On main push: builds all platforms, uploads as workflow artifacts
# On version tag: builds all platforms, creates a GitHub Release draft

name: Build & Release

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:

  build-desktop:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - uses: tauri-apps/tauri-action@v0
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Release ${{ github.ref_name }}'
          releaseDraft: true
          prerelease: false

  deploy-pwa:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

The PWA deployed to GitHub Pages is the web app and the iPad install target.
No separate codebase, no separate build step.

---

## PWA Setup

### `/public/manifest.json`
```json
{
  "name": "Plan Converter",
  "short_name": "PlanConv",
  "display": "standalone",
  "orientation": "landscape",
  "start_url": "/",
  "background_color": "#171717",
  "theme_color": "#171717",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker
Use `vite-plugin-pwa` for service worker generation:
- Pre-cache all app assets on install
- Explicitly cache the pdfjs worker file
- Strategy: cache-first for all static assets (fully offline after first load)
- Do NOT cache user-uploaded files or export output blobs

---

## Styling Rules

- Color palette: `bg-neutral-900` background, `bg-neutral-800` cards, `blue-500` accent
- All interactive states (hover, focus, active, disabled) use Tailwind variants only — no custom CSS
- Thumbnail grid uses Tailwind `grid-cols-*` — no flexbox workarounds
- ExportPanel uses `sticky bottom-0` — the PageSelector grid must have `pb-32` (or equivalent)
  to prevent thumbnails from being hidden behind the panel
- Thumbnail selection ring: `ring-2 ring-blue-500 transition-all duration-150`
- Font: `font-sans` (system font stack only — no external fonts, keeps app offline-safe)
- No decorative elements — this is a professional tool, not a marketing page

---

## Output Specification Summary

| Setting       | Formula                                    | Notes                              |
|---------------|--------------------------------------------|------------------------------------|
| Canvas width  | OUTPUT_WIDTH_INCHES × selected ppi         | Always 36" wide                    |
| Canvas height | OUTPUT_HEIGHT_INCHES × selected ppi        | Always 24" tall                    |
| Fit mode      | Scale to fill width, letterbox if needed   | White background, centered, no crop|
| Format        | PNG                                        | Lossless                           |
| Default PPI   | PPI_OPTIONS[DEFAULT_PPI_INDEX]             | 600 PPI                            |
| Delivery      | Single ZIP archive                         | One file per selected page inside  |
| Naming        | Detected sheet title, fallback Page_##     | Sanitized for OS compatibility     |
