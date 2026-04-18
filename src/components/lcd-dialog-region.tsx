import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Copy, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DialogItem, ExportPreviewDialogItem, PromptDialogItem } from '@/types'

function getPromptDialogFormId(dialogId: string) {
    return `lcd-message-dialog-form-${dialogId}`
}

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

type ExportPreviewDialogBodyProps = {
    dialog: ExportPreviewDialogItem
    intentClassName: string
}

type DialogFooterProps = {
    activeDialog: DialogItem
    intentClassName: string
    onConfirm: () => void
    onDismiss: () => void
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
        <form id={getPromptDialogFormId(dialog.id)} className="lcd-message-dialog-form" onSubmit={handlePromptSubmit}>
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

function ExportPreviewDialogBody({ dialog, intentClassName }: ExportPreviewDialogBodyProps) {
    return (
        <div className="lcd-export-preview">
            <div className="lcd-export-preview-meta">
                <div className="lcd-export-preview-actions">
                    <Button variant="outline" onClick={() => {
                        void dialog.onCopy()
                    }}>
                        <Copy />
                    </Button>
                    <Button className={cn('lcd-message-dialog-confirm', intentClassName)} onClick={() => {
                        void dialog.onDownload()
                    }}>
                        <Download />
                    </Button>
                </div>
            </div>
            <pre className="lcd-export-preview-surface">{dialog.preview}</pre>
        </div>
    )
}

function DialogFooter({ activeDialog, intentClassName, onConfirm, onDismiss }: DialogFooterProps) {
    if (activeDialog.kind === 'export-preview') {
        return (
            <div className="lcd-message-dialog-actions">
                <Button variant="outline" onClick={onDismiss}>
                    {activeDialog.closeLabel}
                </Button>
            </div>
        )
    }

    if (activeDialog.kind === 'alert') {
        return (
            <div className="lcd-message-dialog-actions">
                <Button className={cn('lcd-message-dialog-confirm', intentClassName)} onClick={onConfirm}>
                    {activeDialog.confirmLabel}
                </Button>
            </div>
        )
    }

    if (activeDialog.kind === 'prompt') {
        return (
            <div className="lcd-message-dialog-actions">
                <Button variant="outline" onClick={onDismiss}>
                    {activeDialog.cancelLabel}
                </Button>
                <Button
                    type="submit"
                    form={getPromptDialogFormId(activeDialog.id)}
                    className={cn('lcd-message-dialog-confirm', intentClassName)}
                >
                    {activeDialog.confirmLabel}
                </Button>
            </div>
        )
    }

    return (
        <div className="lcd-message-dialog-actions">
            <Button variant="outline" onClick={onDismiss}>
                {activeDialog.cancelLabel}
            </Button>
            <Button className={cn('lcd-message-dialog-confirm', intentClassName)} onClick={onConfirm}>
                {activeDialog.confirmLabel}
            </Button>
        </div>
    )
}

export function LcdDialogRegion({ activeDialog, onConfirm, onDismiss, onPromptSubmit }: LcdDialogRegionProps) {
    if (!activeDialog) {
        return null
    }

    const intentClassName = `lcd-message-dialog-${activeDialog.intent ?? 'default'}`
    const isExportPreviewDialog = activeDialog.kind === 'export-preview'

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onDismiss()
        }
    }

    return (
        <Dialog
            closeOnBackdrop={activeDialog.allowBackdropDismiss}
            closeOnEscape={activeDialog.allowEscapeDismiss}
            description={activeDialog.kind === 'prompt' || isExportPreviewDialog ? undefined : activeDialog.description}
            onOpenChange={handleOpenChange}
            open
            showCloseButton={activeDialog.showCloseButton}
            cardClassName={isExportPreviewDialog ? 'lcd-dialog-card-export-preview' : 'lcd-dialog-card-compact'}
            footer={(
                <DialogFooter
                    activeDialog={activeDialog}
                    intentClassName={intentClassName}
                    onConfirm={onConfirm}
                    onDismiss={onDismiss}
                />
            )}
            title={activeDialog.title}
        >
            <div className={cn('lcd-message-dialog', intentClassName)}>
                {activeDialog.kind === 'prompt' ? (
                    <PromptDialogForm key={activeDialog.id} dialog={activeDialog} onPromptSubmit={onPromptSubmit} />
                ) : null}
                {activeDialog.kind === 'export-preview' ? (
                    <ExportPreviewDialogBody dialog={activeDialog} intentClassName={intentClassName} />
                ) : null}
            </div>
        </Dialog>
    )
}