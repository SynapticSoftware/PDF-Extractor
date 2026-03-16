/// <reference types="vite/client" />

interface Window {
  __TAURI__?: Record<string, unknown>
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
  }) => Promise<FileSystemFileHandle>
}
