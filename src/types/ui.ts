import type { ReactNode } from 'react'

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

export type ViewportMode = 'mobile' | 'tablet' | 'desktop'

export type IconDropdownMenuItem = {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void | Promise<void>
}
