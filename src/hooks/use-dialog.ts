import { useCallback, useEffect, useRef, useState } from 'react'

import type {
  AlertDialogItem,
  AlertDialogOptions,
  ConfirmDialogItem,
  ConfirmDialogOptions,
  DialogItem,
  ExportPreviewDialogItem,
  ExportPreviewDialogOptions,
  PromptDialogItem,
  PromptDialogOptions,
} from '@/types'

type DialogResolveValue = boolean | string | null | void

type PendingDialog = {
  dialog: DialogItem
  resolve: (value: DialogResolveValue) => void
}

const DEFAULT_CONFIRM_LABELS = {
  alert: 'OK',
  confirm: 'Continue',
  prompt: 'Confirm',
} as const

function getDismissedDialogValue(dialog: DialogItem) {
  if (dialog.kind === 'confirm') {
    return false
  }

  if (dialog.kind === 'prompt') {
    return null
  }

  return undefined
}

function createConfirmDialog(options: ConfirmDialogOptions): ConfirmDialogItem {
  return {
    allowBackdropDismiss: options.allowBackdropDismiss ?? true,
    allowEscapeDismiss: options.allowEscapeDismiss ?? true,
    cancelLabel: options.cancelLabel ?? 'Cancel',
    confirmLabel: options.confirmLabel ?? DEFAULT_CONFIRM_LABELS.confirm,
    description: options.description,
    id: crypto.randomUUID(),
    intent: options.intent ?? 'warning',
    kind: 'confirm',
    showCloseButton: options.showCloseButton ?? true,
    title: options.title,
  }
}

function createPromptDialog(options: PromptDialogOptions): PromptDialogItem {
  return {
    allowBackdropDismiss: options.allowBackdropDismiss ?? true,
    allowEscapeDismiss: options.allowEscapeDismiss ?? true,
    cancelLabel: options.cancelLabel ?? 'Cancel',
    confirmLabel: options.confirmLabel ?? DEFAULT_CONFIRM_LABELS.prompt,
    defaultValue: options.defaultValue ?? '',
    description: options.description,
    id: crypto.randomUUID(),
    inputLabel: options.inputLabel,
    inputPlaceholder: options.inputPlaceholder,
    intent: options.intent ?? 'default',
    kind: 'prompt',
    showCloseButton: options.showCloseButton ?? true,
    title: options.title,
    validate: options.validate,
  }
}

function createAlertDialog(options: AlertDialogOptions): AlertDialogItem {
  return {
    allowBackdropDismiss: options.allowBackdropDismiss ?? true,
    allowEscapeDismiss: options.allowEscapeDismiss ?? true,
    confirmLabel: options.confirmLabel ?? DEFAULT_CONFIRM_LABELS.alert,
    description: options.description,
    id: crypto.randomUUID(),
    intent: options.intent ?? 'default',
    kind: 'alert',
    showCloseButton: options.showCloseButton ?? true,
    title: options.title,
  }
}

function createExportPreviewDialog(options: ExportPreviewDialogOptions): ExportPreviewDialogItem {
  return {
    allowBackdropDismiss: options.allowBackdropDismiss ?? true,
    allowEscapeDismiss: options.allowEscapeDismiss ?? true,
    closeLabel: options.closeLabel ?? 'Close',
    confirmLabel: options.confirmLabel ?? 'Download',
    copyLabel: options.copyLabel ?? 'Copy',
    description: options.description,
    downloadLabel: options.downloadLabel ?? 'Download',
    fileName: options.fileName,
    id: crypto.randomUUID(),
    inoExportOptions: options.inoExportOptions,
    intent: options.intent ?? 'default',
    kind: 'export-preview',
    onCopy: options.onCopy,
    onDownload: options.onDownload,
    preview: options.preview,
    showCloseButton: options.showCloseButton ?? true,
    title: options.title,
  }
}

export function useDialog() {
  const [activeDialog, setActiveDialog] = useState<DialogItem | null>(null)
  const activeDialogRef = useRef<DialogItem | null>(null)
  const activeResolveRef = useRef<((value: DialogResolveValue) => void) | null>(null)
  const pendingDialogsRef = useRef<PendingDialog[]>([])

  const activatePendingDialog = useCallback((pendingDialog: PendingDialog | null) => {
    activeDialogRef.current = pendingDialog?.dialog ?? null
    activeResolveRef.current = pendingDialog?.resolve ?? null
    setActiveDialog(pendingDialog?.dialog ?? null)
  }, [])

  const showNextDialog = useCallback(() => {
    const nextPendingDialog = pendingDialogsRef.current.shift() ?? null
    activatePendingDialog(nextPendingDialog)
  }, [activatePendingDialog])

  const settleActiveDialog = useCallback((value: DialogResolveValue) => {
    const resolveActiveDialog = activeResolveRef.current

    if (!resolveActiveDialog) {
      return
    }

    resolveActiveDialog(value)
    showNextDialog()
  }, [showNextDialog])

  const enqueueDialog = useCallback(<TValue,>(dialog: DialogItem) => {
    return new Promise<TValue>((resolve) => {
      const pendingDialog: PendingDialog = {
        dialog,
        resolve: resolve as (value: DialogResolveValue) => void,
      }

      if (activeDialogRef.current) {
        pendingDialogsRef.current.push(pendingDialog)
        return
      }

      activatePendingDialog(pendingDialog)
    })
  }, [activatePendingDialog])

  const dismissActiveDialog = useCallback(() => {
    const dialog = activeDialogRef.current

    if (!dialog) {
      return
    }

    settleActiveDialog(getDismissedDialogValue(dialog))
  }, [settleActiveDialog])

  const confirmActiveDialog = useCallback(() => {
    const dialog = activeDialogRef.current

    if (!dialog) {
      return
    }

    if (dialog.kind === 'confirm') {
      settleActiveDialog(true)
      return
    }

    settleActiveDialog(undefined)
  }, [settleActiveDialog])

  const submitPromptDialog = useCallback((value: string) => {
    settleActiveDialog(value)
  }, [settleActiveDialog])

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return enqueueDialog<boolean>(createConfirmDialog(options))
  }, [enqueueDialog])

  const prompt = useCallback((options: PromptDialogOptions) => {
    return enqueueDialog<string | null>(createPromptDialog(options))
  }, [enqueueDialog])

  const alert = useCallback((options: AlertDialogOptions) => {
    return enqueueDialog<void>(createAlertDialog(options))
  }, [enqueueDialog])

  const exportPreview = useCallback((options: ExportPreviewDialogOptions) => {
    return enqueueDialog<void>(createExportPreviewDialog(options))
  }, [enqueueDialog])

  useEffect(() => {
    const pendingDialogs = pendingDialogsRef.current

    return () => {
      const activePendingDialog = activeDialogRef.current

      if (activePendingDialog && activeResolveRef.current) {
        activeResolveRef.current(getDismissedDialogValue(activePendingDialog))
      }

      pendingDialogs.forEach(({ dialog, resolve }) => {
        resolve(getDismissedDialogValue(dialog))
      })
    }
  }, [])

  return {
    activeDialog,
    alert,
    confirm,
    confirmActiveDialog,
    dismissActiveDialog,
    exportPreview,
    prompt,
    submitPromptDialog,
  }
}
