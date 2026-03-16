import { useEffect, useRef } from 'react'
import { ERROR_BANNER_TIMEOUT_MS } from '../constants'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

/**
 * Fixed top banner that displays error messages.
 * Auto-dismisses after ERROR_BANNER_TIMEOUT_MS.
 * Resets the timer if a new error replaces the current one.
 */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Reset timer whenever the message changes
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onDismiss, ERROR_BANNER_TIMEOUT_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, onDismiss])

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center justify-between"
    >
      <p className="text-sm">{message}</p>
      <button
        type="button"
        aria-label="Dismiss error"
        className="ml-4 text-white/80 hover:text-white text-lg leading-none"
        onClick={onDismiss}
      >
        &times;
      </button>
    </div>
  )
}
