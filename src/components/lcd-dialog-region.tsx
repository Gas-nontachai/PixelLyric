import { type FormEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DialogItem, PromptDialogItem } from '@/types'

type LcdDialogRegionProps = {
  activeDialog: DialogItem | null
  onConfirm: () => void
  onDismiss: () => void
  onPromptSubmit: (value: string) => void
}

type PromptDialogFormProps = {
  dialog: PromptDialogItem
  onPromptSubmit: (value: string) => void
}

function PromptDialogForm({ dialog, onPromptSubmit }: PromptDialogFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [promptValue, setPromptValue] = useState(dialog.defaultValue)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  useEffect(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  const handlePromptSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextValidationMessage = dialog.validate?.(promptValue) ?? null

    if (nextValidationMessage) {
      setValidationMessage(nextValidationMessage)
      return
    }

    setValidationMessage(null)
    onPromptSubmit(promptValue)
  }

  return (
    <form id="lcd-message-dialog-form" className="lcd-message-dialog-form" onSubmit={handlePromptSubmit}>
      <p className="lcd-message-dialog-copy">{dialog.description}</p>
      <label className="lcd-field lcd-message-dialog-field">
        {dialog.inputLabel ? <span>{dialog.inputLabel}</span> : null}
        <input
          ref={inputRef}
          value={promptValue}
          placeholder={dialog.inputPlaceholder}
          onChange={(event) => {
            setPromptValue(event.target.value)

            if (validationMessage) {
              setValidationMessage(null)
            }
          }}
          aria-invalid={validationMessage ? 'true' : 'false'}
        />
      </label>
      {validationMessage ? <p className="lcd-message-dialog-error">{validationMessage}</p> : null}
    </form>
  )
}

export function LcdDialogRegion({ activeDialog, onConfirm, onDismiss, onPromptSubmit }: LcdDialogRegionProps) {
  if (!activeDialog) {
    return null
  }

  const intentClassName = `lcd-message-dialog-${activeDialog.intent ?? 'default'}`
  const shouldShowCancelAction = activeDialog.kind === 'confirm' || activeDialog.kind === 'prompt'

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onDismiss()
    }
  }

  return (
    <Dialog
      cardClassName="lcd-dialog-card-compact"
      closeOnBackdrop={activeDialog.allowBackdropDismiss}
      closeOnEscape={activeDialog.allowEscapeDismiss}
      description={activeDialog.kind === 'prompt' ? undefined : activeDialog.description}
      footer={(
        <div className="lcd-message-dialog-actions">
          {shouldShowCancelAction ? (
            <Button variant="outline" onClick={onDismiss}>
              {activeDialog.cancelLabel}
            </Button>
          ) : null}
          <Button
            className={cn('lcd-message-dialog-confirm', intentClassName)}
            form={activeDialog.kind === 'prompt' ? 'lcd-message-dialog-form' : undefined}
            onClick={activeDialog.kind === 'prompt' ? undefined : onConfirm}
            type={activeDialog.kind === 'prompt' ? 'submit' : 'button'}
          >
            {activeDialog.confirmLabel}
          </Button>
        </div>
      )}
      onOpenChange={handleOpenChange}
      open
      showCloseButton={activeDialog.showCloseButton}
      title={activeDialog.title}
    >
      <div className={cn('lcd-message-dialog', intentClassName)}>
        {activeDialog.kind === 'prompt' ? (
          <PromptDialogForm key={activeDialog.id} dialog={activeDialog} onPromptSubmit={onPromptSubmit} />
        ) : null}
      </div>
    </Dialog>
  )
}