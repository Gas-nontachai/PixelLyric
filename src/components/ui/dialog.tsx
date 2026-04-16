import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type DialogProps = {
  children: ReactNode
  description?: ReactNode
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  title: ReactNode
}

export function Dialog({ children, description, footer, onOpenChange, open, title }: DialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  }, [onOpenChange, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="lcd-dialog-root" role="dialog" aria-modal="true" aria-label={String(title)}>
      <div className="lcd-dialog-backdrop" onClick={() => onOpenChange(false)} />
      <div className="lcd-dialog-card">
        <div className="lcd-dialog-header">
          <div className="lcd-dialog-heading">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <Button size="icon" variant="outline" onClick={() => onOpenChange(false)} aria-label="Close dialog">
            <X />
          </Button>
        </div>
        <div className="lcd-dialog-body">{children}</div>
        {footer ? <div className="lcd-dialog-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}