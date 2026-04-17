import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { IconDropdownMenuActionItem, IconDropdownMenuItem, IconDropdownMenuParentItem } from '@/types'

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
  const [activeParentId, setActiveParentId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isMenuOpen = !disabled && isOpen

  const closeMenu = () => {
    setActiveParentId(null)
    setIsOpen(false)
  }

  const isParentItem = (item: IconDropdownMenuItem): item is IconDropdownMenuParentItem => {
    return Array.isArray((item as Partial<IconDropdownMenuParentItem>).children)
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const handleItemSelect = async (item: IconDropdownMenuActionItem) => {
    closeMenu()
    await item.onSelect()
  }

  const handleParentToggle = (itemId: string) => {
    setActiveParentId((currentValue) => (currentValue === itemId ? null : itemId))
  }

  return (
    <div className="lcd-icon-dropdown" ref={menuRef}>
      <Button
        size="icon"
        variant="outline"
        className={`lcd-icon-dropdown-trigger${isMenuOpen ? ' lcd-icon-dropdown-trigger-open' : ''}`}
        onClick={() => {
          setActiveParentId(null)
          setIsOpen((currentValue) => !currentValue)
        }}
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
            <div
              key={item.id}
              className={`lcd-icon-dropdown-entry${isParentItem(item) && activeParentId === item.id ? ' lcd-icon-dropdown-entry-open' : ''}`}
              onMouseEnter={() => {
                if (isParentItem(item)) {
                  setActiveParentId(item.id)
                }
              }}
            >
              {isParentItem(item) ? (
                <button
                  type="button"
                  className="lcd-icon-dropdown-item lcd-icon-dropdown-item-parent"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={activeParentId === item.id}
                  onClick={() => handleParentToggle(item.id)}
                >
                  <span className="lcd-icon-dropdown-item-label">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight className="lcd-icon-dropdown-submenu-chevron" />
                </button>
              ) : (
                <button
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
              )}

              {isParentItem(item) && activeParentId === item.id ? (
                <div className="lcd-icon-dropdown-submenu" role="menu" aria-label={item.label}>
                  {item.children.map((childItem) => (
                    <button
                      key={childItem.id}
                      type="button"
                      className="lcd-icon-dropdown-item lcd-icon-dropdown-submenu-item"
                      role="menuitem"
                      onClick={() => {
                        void handleItemSelect(childItem)
                      }}
                    >
                      {childItem.icon}
                      <span>{childItem.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}