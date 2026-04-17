import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DialogProps = {
  cardClassName?: string
  children: ReactNode
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  description?: ReactNode
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  showCloseButton?: boolean
  title: ReactNode
}

export function Dialog({
  cardClassName,
  children,
  closeOnBackdrop = true,
  closeOnEscape = true,
  description,
  footer,
  onOpenChange,
  open,
  showCloseButton = true,
  title,
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeOnEscape, onOpenChange, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="lcd-dialog-root" role="dialog" aria-modal="true" aria-label={String(title)}>
      <div className="lcd-dialog-backdrop" onClick={() => {
        if (closeOnBackdrop) {
          onOpenChange(false)
        }
      }} />
      <div className={cn('lcd-dialog-card', cardClassName)}>
        <div className="lcd-dialog-header">
          <div className="lcd-dialog-heading">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {showCloseButton ? (
            <Button size="icon" variant="outline" onClick={() => onOpenChange(false)} aria-label="Close dialog">
              <X />
            </Button>
          ) : null}
        </div>
        <div className="lcd-dialog-body">{children}</div>
        {footer ? <div className="lcd-dialog-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}