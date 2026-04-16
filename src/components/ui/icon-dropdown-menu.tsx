import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { IconDropdownMenuItem } from '@/types'

type IconDropdownMenuProps = {
  ariaLabel: string
  disabled?: boolean
  items: IconDropdownMenuItem[]
  menuLabel: string
  tooltipLabel?: string
  triggerIcon: ReactNode
}

export function IconDropdownMenu({
  ariaLabel,
  disabled = false,
  items,
  menuLabel,
  tooltipLabel,
  triggerIcon,
}: IconDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isMenuOpen = !disabled && isOpen

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const handleItemSelect = async (item: IconDropdownMenuItem) => {
    setIsOpen(false)
    await item.onSelect()
  }

  return (
    <div className="lcd-icon-dropdown" ref={menuRef}>
      <Button
        size="icon"
        variant="outline"
        className={`lcd-icon-dropdown-trigger${isMenuOpen ? ' lcd-icon-dropdown-trigger-open' : ''}`}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={ariaLabel}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        title={tooltipLabel}
        disabled={disabled}
      >
        {triggerIcon}
        <ChevronDown className="lcd-icon-dropdown-trigger-chevron" />
      </Button>

      {tooltipLabel ? (
        <span className="lcd-icon-dropdown-tooltip" role="tooltip">
          {tooltipLabel}
        </span>
      ) : null}

      {isMenuOpen ? (
        <div className="lcd-icon-dropdown-panel" role="menu" aria-label={menuLabel}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="lcd-icon-dropdown-item"
              role="menuitem"
              onClick={() => {
                void handleItemSelect(item)
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}