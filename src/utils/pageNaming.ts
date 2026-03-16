import { AppError } from '../types'
import { PAGE_NAME_MAX_LENGTH } from '../constants'

/**
 * Generates a default page name from a detected sheet title or page number.
 * Sanitizes the detected name or falls back to "Page_##" format.
 * Pure function — no async, no side effects, no errors thrown.
 */
export function generateDefaultName(detectedName: string | null, pageNumber: number): string {
  if (detectedName !== null) {
    const sanitized = detectedName
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, PAGE_NAME_MAX_LENGTH)
    if (sanitized.length > 0) {
      return sanitized
    }
  }
  return `Page_${String(pageNumber).padStart(2, '0')}`
}

/**
 * Sanitizes a user-edited page name using the same rules as generateDefaultName.
 * Throws AppError if the result after sanitization is an empty string.
 */
export function sanitizePageName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, PAGE_NAME_MAX_LENGTH)

  if (sanitized.length === 0) {
    const err = new AppError(
      'Page name cannot be empty after removing invalid characters.',
      `sanitizePageName received "${name}" which sanitized to empty string`
    )
    console.error('[sanitizePageName]', err)
    throw err
  }

  return sanitized
}
