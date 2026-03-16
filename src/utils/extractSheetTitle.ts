import type { PDFPageProxy } from 'pdfjs-dist'
import { AppError } from '../types'
import { SHEET_TITLE_MIN_LENGTH, SHEET_TITLE_MAX_LENGTH } from '../constants'

// Matches common architectural sheet number formats: A1.0, S-101, E2, M-1.1, etc.
const SHEET_NUMBER_PATTERN = /^[A-Za-z]{1,2}[-.]?\d{1,3}([-.]\d{1,3})?$/

// Keywords that appear near sheet numbers in title blocks
const TITLE_BLOCK_KEYWORDS = /sheet|drawing\s*no|sheet\s*no/i

/**
 * Extracts the sheet title/number from a PDF page's text layer.
 * Searches for common architectural title block patterns.
 * Returns the best candidate string, or null if no confident match is found.
 * Throws AppError only if the text layer itself cannot be accessed.
 */
export async function extractSheetTitle(page: PDFPageProxy): Promise<string | null> {
  let textContent
  try {
    textContent = await page.getTextContent()
  } catch (e) {
    const err = new AppError(
      'Could not read text from PDF page.',
      `page.getTextContent() failed for page ${page.pageNumber}: ${e}`
    )
    console.error('[extractSheetTitle]', err)
    throw err
  }

  const items = textContent.items.filter(
    (item): item is typeof item & { str: string } => 'str' in item
  )

  // First pass: look for strings near title block keywords
  for (let i = 0; i < items.length; i++) {
    const text = items[i].str.trim()
    if (TITLE_BLOCK_KEYWORDS.test(text)) {
      // Check the next few items for a sheet number
      for (let j = i + 1; j < Math.min(i + 4, items.length); j++) {
        const candidate = items[j].str.trim()
        if (
          candidate.length >= SHEET_TITLE_MIN_LENGTH &&
          candidate.length <= SHEET_TITLE_MAX_LENGTH &&
          SHEET_NUMBER_PATTERN.test(candidate)
        ) {
          return candidate
        }
      }
    }
  }

  // Second pass: standalone short strings matching sheet number format
  for (const item of items) {
    const candidate = item.str.trim()
    if (
      candidate.length >= SHEET_TITLE_MIN_LENGTH &&
      candidate.length <= SHEET_TITLE_MAX_LENGTH &&
      SHEET_NUMBER_PATTERN.test(candidate)
    ) {
      return candidate
    }
  }

  return null
}
