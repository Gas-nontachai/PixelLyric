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

export type DialogIntent = 'default' | 'success' | 'warning' | 'danger'

type BaseDialogOptions = {
  allowBackdropDismiss?: boolean
  allowEscapeDismiss?: boolean
  confirmLabel?: string
  description?: ReactNode
  intent?: DialogIntent
  showCloseButton?: boolean
  title: ReactNode
}

export type ConfirmDialogOptions = BaseDialogOptions & {
  cancelLabel?: string
}

export type PromptDialogOptions = BaseDialogOptions & {
  cancelLabel?: string
  defaultValue?: string
  inputLabel?: ReactNode
  inputPlaceholder?: string
  validate?: (value: string) => string | undefined
}

export type AlertDialogOptions = BaseDialogOptions

type BaseDialogItem = BaseDialogOptions & {
  id: string
}

export type ConfirmDialogItem = BaseDialogItem & {
  cancelLabel: string
  kind: 'confirm'
}

export type PromptDialogItem = BaseDialogItem & {
  cancelLabel: string
  defaultValue: string
  inputLabel?: ReactNode
  inputPlaceholder?: string
  kind: 'prompt'
  validate?: (value: string) => string | undefined
}

export type AlertDialogItem = BaseDialogItem & {
  kind: 'alert'
}

export type DialogItem = ConfirmDialogItem | PromptDialogItem | AlertDialogItem

export type ViewportMode = 'mobile' | 'tablet' | 'desktop'

export type IconDropdownMenuItem = {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void | Promise<void>
}
