import { useCallback, useRef, useState } from 'react'

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export type ToastItem = {
  id: string
  isLeaving: boolean
  message: string
  position: ToastPosition
  variant: ToastVariant
}

type ShowToastOptions = {
  position?: ToastPosition
  variant?: ToastVariant
}

const TOAST_VISIBLE_MS = 2200
const TOAST_EXIT_MS = 220
const DEFAULT_POSITION: ToastPosition = 'top-right'
const DEFAULT_VARIANT: ToastVariant = 'info'

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timeoutRefs = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id
          ? {
              ...toast,
              isLeaving: true,
            }
          : toast,
      ),
    )

    const removeTimeout = window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id))
      timeoutRefs.current.delete(id)
    }, TOAST_EXIT_MS)

    timeoutRefs.current.set(id, removeTimeout)
  }, [])

  const showToast = useCallback(
    (message: string, options: ShowToastOptions = {}) => {
      const id = crypto.randomUUID()
      const position = options.position ?? DEFAULT_POSITION
      const variant = options.variant ?? DEFAULT_VARIANT

      setToasts((currentToasts) => [
        ...currentToasts,
        { id, isLeaving: false, message, position, variant },
      ])

      const visibleTimeout = window.setTimeout(() => {
        dismissToast(id)
      }, TOAST_VISIBLE_MS)

      timeoutRefs.current.set(id, visibleTimeout)
    },
    [dismissToast],
  )

  return {
    showToast,
    toasts,
  }
}
