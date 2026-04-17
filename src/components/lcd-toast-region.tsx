import type { ToastItem, ToastPosition } from '@/types'

type LcdToastRegionProps = {
  toasts: ToastItem[]
}

const TOAST_POSITIONS: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

export function LcdToastRegion({ toasts }: LcdToastRegionProps) {
  return (
    <>
      {TOAST_POSITIONS.map((position) => {
        const positionToasts = toasts.filter((toast) => toast.position === position)

        if (!positionToasts.length) {
          return null
        }

        return (
          <div
            key={position}
            className={`lcd-toast-region lcd-toast-region-${position}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {positionToasts.map((toast) => (
              <div
                key={toast.id}
                className={`lcd-toast lcd-toast-${toast.variant}${toast.isLeaving ? ' lcd-toast-leaving' : ''}`}
              >
                {toast.message}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
