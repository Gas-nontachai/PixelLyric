import {
  memo,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ChevronLeft, ChevronRight, Copy, Plus, SmilePlus, Trash2, X } from 'lucide-react'

import {
  DURATION_UNIT_OPTIONS,
  LCD_TEXT_PLACEHOLDER,
  PAGE_ANIMATION_OPTIONS,
  PAGE_MODE_OPTIONS,
  SCROLL_ANIMATION_OPTIONS,
} from '@/configs/lcd'
import {
  CUSTOM_EMOJI_GROUPS,
  CUSTOM_EMOJI_LIMIT,
  getCustomEmojiItem,
} from '@/configs/custom-emoji'
import { getSpecialTextItem, SPECIAL_TEXT_GROUPS } from '@/configs/special-text'
import { Button } from '@/components/ui/button'
import {
  formatDurationInput,
  normalizePageText,
} from '@/lib/lcd'
import type {
  DurationUnit,
  LcdAnimation,
  PageMode,
  PageScript,
  ScreenPreset,
  ScreenPresetId,
  ToastPosition,
  ToastVariant,
} from '@/types'
import type { PageDropPosition, PageSelectionOptions } from '@/lib/editor-page-selection'

type LcdControlPanelProps = {
  presets: ScreenPreset[]
  selectedScreenType: ScreenPresetId
  columns: number
  rows: number
  pages: PageScript[]
  selectedPageIds: string[]
  activePageIndex: number
  isPlaybackLocked: boolean
  canCloseEditor: boolean
  onCloseEditor: () => void
  onScreenTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onSelectPage: (pageIndex: number, options?: PageSelectionOptions) => void
  onAddPage: () => void
  onDuplicateSelectedPages: () => void
  onDeleteSelectedPages: () => void
  onReorderPages: (draggedPageId: string, targetPageId: string, dropPosition: PageDropPosition) => void
  onPageModeChange: (pageIndex: number, mode: PageMode) => void
  onPageAnimationChange: (pageIndex: number, animation: LcdAnimation) => void
  onPageTextChange: (pageIndex: number, event: ChangeEvent<HTMLTextAreaElement>) => void
  onPageTextValueChange: (pageIndex: number, value: string) => void
  onRowTextChange: (pageIndex: number, rowIndex: number, value: string) => void
  onDurationValueChange: (
    pageIndex: number,
    value: string,
  ) => { durationMs: number; wasClamped: boolean }
  onDurationUnitChange: (pageIndex: number, unit: DurationUnit) => void
  onShowToast: (
    message: string,
    options?: { position?: ToastPosition; variant?: ToastVariant },
  ) => void
}

function LcdControlPanelComponent({
  presets,
  selectedScreenType,
  columns,
  rows,
  pages,
  selectedPageIds,
  activePageIndex,
  isPlaybackLocked,
  canCloseEditor,
  onCloseEditor,
  onScreenTypeChange,
  onSelectPage,
  onAddPage,
  onDuplicateSelectedPages,
  onDeleteSelectedPages,
  onReorderPages,
  onPageModeChange,
  onPageAnimationChange,
  onPageTextChange,
  onPageTextValueChange,
  onRowTextChange,
  onDurationValueChange,
  onDurationUnitChange,
  onShowToast,
}: LcdControlPanelProps) {
  const activePage = pages[activePageIndex]
  const selectedPageIdSet = useMemo(() => new Set(selectedPageIds), [selectedPageIds])
  const animationOptions =
    activePage.mode === 'scroll' ? SCROLL_ANIMATION_OPTIONS : PAGE_ANIMATION_OPTIONS
  const formattedDuration = formatDurationInput(activePage.durationMs, activePage.durationUnit)
  const [dragState, setDragState] = useState<{
    draggedPageId: string | null
    draggedPageIds: string[]
    targetPageId: string | null
    dropPosition: PageDropPosition | null
  }>({
    draggedPageId: null,
    draggedPageIds: [],
    targetPageId: null,
    dropPosition: null,
  })
  const [recentlyDroppedPageIds, setRecentlyDroppedPageIds] = useState<string[]>([])
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const pageTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const specialTextAnchorRef = useRef<HTMLSpanElement | null>(null)
  const beforeDropRectsRef = useRef<Map<string, DOMRect> | null>(null)
  const recentlyDroppedTimeoutRef = useRef<number | null>(null)
  const [specialTextPanelState, setSpecialTextPanelState] = useState<'closed' | 'open' | 'closing'>('closed')
  const [specialTextTab, setSpecialTextTab] = useState<'chars' | 'emoji'>('chars')
  const isSpecialTextOpen = specialTextPanelState === 'open'
  const isSpecialTextPanelVisible = specialTextPanelState !== 'closed'
  const recentlyDroppedPageIdSet = useMemo(() => (
    new Set(recentlyDroppedPageIds)
  ), [recentlyDroppedPageIds])
  const draggedPageIdSet = useMemo(() => (
    new Set(dragState.draggedPageIds)
  ), [dragState.draggedPageIds])
  const [durationDraftState, setDurationDraftState] = useState({
    pageId: activePage.id,
    unit: activePage.durationUnit,
    value: formattedDuration,
  })
  const durationDraft =
    durationDraftState.pageId === activePage.id && durationDraftState.unit === activePage.durationUnit
      ? durationDraftState.value
      : formattedDuration

  const commitDurationDraft = () => {
    const result = onDurationValueChange(activePageIndex, durationDraft)
    setDurationDraftState({
      pageId: activePage.id,
      unit: activePage.durationUnit,
      value: formatDurationInput(result.durationMs, activePage.durationUnit),
    })

    if (result.wasClamped) {
      onShowToast('Duration adjusted to 100 ms minimum', {
        position: 'top-right',
        variant: 'error',
      })
    }
  }

  const handleDurationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.currentTarget.blur()
  }

  const selectedActionCount = selectedPageIds.length > 0 ? selectedPageIds.length : 1
  const canDeleteSelectedPages = pages.length > selectedActionCount

  const toggleSpecialTextPanel = () => {
    setSpecialTextPanelState((currentState) => (currentState === 'open' ? 'closing' : 'open'))
  }

  const getUniqueCustomGlyphCount = (value: string) => {
    const customGlyphDisplays = new Set<string>()

    for (const character of Array.from(value)) {
      const customEmojiItem = getCustomEmojiItem(character)
      const specialTextItem = getSpecialTextItem(character)

      if (customEmojiItem) {
        customGlyphDisplays.add(customEmojiItem.display)
      } else if (specialTextItem && specialTextItem.code >= 0 && specialTextItem.code <= 7) {
        customGlyphDisplays.add(specialTextItem.display)
      }
    }

    return customGlyphDisplays.size
  }

  const insertSpecialText = (display: string, options: { isEmoji?: boolean } = {}) => {
    const textarea = pageTextAreaRef.current
    const selectionStart = textarea?.selectionStart ?? activePage.text.length
    const selectionEnd = textarea?.selectionEnd ?? selectionStart
    const nextText = `${activePage.text.slice(0, selectionStart)}${display}${activePage.text.slice(selectionEnd)}`
    const normalizedNextText = normalizePageText(nextText, columns, rows)
    const nextCursorPosition = selectionStart + display.length

    if (
      options.isEmoji &&
      !activePage.text.includes(display) &&
      getUniqueCustomGlyphCount(normalizedNextText) > CUSTOM_EMOJI_LIMIT
    ) {
      onShowToast(`LCD custom emoji limit is ${CUSTOM_EMOJI_LIMIT} per page`, {
        position: 'top-right',
        variant: 'error',
      })
      return
    }

    onPageTextValueChange(activePageIndex, normalizedNextText)

    window.requestAnimationFrame(() => {
      pageTextAreaRef.current?.focus()
      pageTextAreaRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  const setPageTabRef = useCallback((pageId: string, node: HTMLButtonElement | null) => {
    if (node) {
      tabRefs.current.set(pageId, node)
      return
    }

    tabRefs.current.delete(pageId)
  }, [])

  const getMovingPageIds = useCallback((pageId: string) => (
    selectedPageIdSet.has(pageId)
      ? pages.filter((page) => selectedPageIdSet.has(page.id)).map((page) => page.id)
      : [pageId]
  ), [pages, selectedPageIdSet])

  const captureTabRects = () => {
    beforeDropRectsRef.current = new Map(
      Array.from(tabRefs.current.entries()).map(([pageId, element]) => (
        [pageId, element.getBoundingClientRect()]
      )),
    )
  }

  const clearDragState = () => {
    setDragState({
      draggedPageId: null,
      draggedPageIds: [],
      targetPageId: null,
      dropPosition: null,
    })
  }

  const clearDropTarget = () => {
    setDragState((currentDragState) => ({
      ...currentDragState,
      targetPageId: null,
      dropPosition: null,
    }))
  }

  const handlePageChipDragStart = (event: DragEvent<HTMLButtonElement>, pageId: string) => {
    const movingPageIds = getMovingPageIds(pageId)

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', pageId)
    setDragState({
      draggedPageId: pageId,
      draggedPageIds: movingPageIds,
      targetPageId: null,
      dropPosition: null,
    })
  }

  const handlePageChipDragOver = (event: DragEvent<HTMLButtonElement>, pageId: string) => {
    if (isPlaybackLocked || !dragState.draggedPageId) {
      return
    }

    const movingPageIds = new Set(dragState.draggedPageIds)

    if (movingPageIds.has(pageId)) {
      if (dragState.targetPageId !== null || dragState.dropPosition !== null) {
        clearDropTarget()
      }
      return
    }

    event.preventDefault()
    const { left, width } = event.currentTarget.getBoundingClientRect()
    const dropPosition = event.clientX - left < width / 2 ? 'before' : 'after'

    setDragState((currentDragState) => (
      currentDragState.targetPageId === pageId && currentDragState.dropPosition === dropPosition
        ? currentDragState
        : {
            ...currentDragState,
            targetPageId: pageId,
            dropPosition,
          }
    ))
  }

  const handlePageChipDrop = (pageId: string) => {
    if (!dragState.draggedPageId || !dragState.targetPageId || !dragState.dropPosition) {
      clearDragState()
      return
    }

    captureTabRects()
    setRecentlyDroppedPageIds(dragState.draggedPageIds)
    onReorderPages(dragState.draggedPageId, pageId, dragState.dropPosition)
    clearDragState()
  }

  useLayoutEffect(() => {
    const beforeDropRects = beforeDropRectsRef.current

    if (!beforeDropRects) {
      return
    }

    beforeDropRectsRef.current = null

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    tabRefs.current.forEach((element, pageId) => {
      const previousRect = beforeDropRects.get(pageId)

      if (!previousRect) {
        return
      }

      const nextRect = element.getBoundingClientRect()
      const deltaX = previousRect.left - nextRect.left
      const deltaY = previousRect.top - nextRect.top

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        return
      }

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: 260,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        },
      )
    })
  }, [pages, recentlyDroppedPageIds])

  useEffect(() => {
    if (recentlyDroppedTimeoutRef.current !== null) {
      window.clearTimeout(recentlyDroppedTimeoutRef.current)
      recentlyDroppedTimeoutRef.current = null
    }

    if (recentlyDroppedPageIds.length === 0) {
      return undefined
    }

    recentlyDroppedTimeoutRef.current = window.setTimeout(() => {
      setRecentlyDroppedPageIds([])
      recentlyDroppedTimeoutRef.current = null
    }, 720)

    return () => {
      if (recentlyDroppedTimeoutRef.current !== null) {
        window.clearTimeout(recentlyDroppedTimeoutRef.current)
        recentlyDroppedTimeoutRef.current = null
      }
    }
  }, [recentlyDroppedPageIds])

  useEffect(() => {
    if (specialTextPanelState !== 'closing') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setSpecialTextPanelState('closed')
    }, 160)

    return () => window.clearTimeout(timeoutId)
  }, [specialTextPanelState])

  useEffect(() => {
    if (specialTextPanelState !== 'open') {
      return undefined
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node) || specialTextAnchorRef.current?.contains(target)) {
        return
      }

      setSpecialTextPanelState('closing')
    }

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSpecialTextPanelState('closing')
      }
    }

    window.addEventListener('pointerdown', closeOnOutsidePointerDown)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointerDown)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [specialTextPanelState])

  return (
    <div
      className={`lcd-editor${isPlaybackLocked ? ' lcd-editor-locked' : ''}`}
      aria-disabled={isPlaybackLocked}
    >
      <div className="lcd-editor-topbar">
        <div className="lcd-editor-header-row">
          <span className="lcd-editor-heading">Editor</span>
          {canCloseEditor ? (
            <Button size="icon" variant="outline" onClick={onCloseEditor} aria-label="Close editor">
              <X />
            </Button>
          ) : null}
        </div>

        <div className="lcd-editor-tabs" role="tablist" aria-label="Pages">
          {pages.map((page, pageIndex) => (
            <button
              key={page.id}
              ref={(node) => setPageTabRef(page.id, node)}
              className={[
                'lcd-editor-tab',
                pageIndex === activePageIndex ? 'lcd-editor-tab-active' : '',
                selectedPageIdSet.has(page.id) ? 'lcd-editor-tab-selected' : '',
                pageIndex === activePageIndex && selectedPageIdSet.has(page.id) ? 'lcd-editor-tab-active-selected' : '',
                dragState.draggedPageId === page.id ? 'lcd-editor-tab-dragging' : '',
                draggedPageIdSet.has(page.id) ? 'lcd-editor-tab-drag-group' : '',
                recentlyDroppedPageIdSet.has(page.id) ? 'lcd-editor-tab-dropped' : '',
                dragState.targetPageId === page.id && dragState.dropPosition === 'before' ? 'lcd-editor-tab-drop-before' : '',
                dragState.targetPageId === page.id && dragState.dropPosition === 'after' ? 'lcd-editor-tab-drop-after' : '',
              ].filter(Boolean).join(' ')}
              onClick={(event) => onSelectPage(pageIndex, { shiftKey: event.shiftKey })}
              onDragEnd={clearDragState}
              onDragOver={(event) => handlePageChipDragOver(event, page.id)}
              onDragStart={(event) => handlePageChipDragStart(event, page.id)}
              onDrop={() => handlePageChipDrop(page.id)}
              disabled={isPlaybackLocked}
              draggable={!isPlaybackLocked}
              role="tab"
              aria-pressed={selectedPageIdSet.has(page.id)}
              aria-selected={pageIndex === activePageIndex}
            >
              {pageIndex + 1}
              {dragState.draggedPageId === page.id && dragState.draggedPageIds.length > 1 ? (
                <span className="lcd-editor-tab-drag-count" aria-label={`${dragState.draggedPageIds.length} pages selected`}>
                  {dragState.draggedPageIds.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {selectedPageIds.length > 1 ? (
          <span className="lcd-editor-selection-summary">{`${selectedPageIds.length} selected`}</span>
        ) : null}

        <div className="lcd-editor-actions">
          <Button
            size="icon"
            variant="outline"
            onClick={() => onSelectPage(activePageIndex - 1)}
            disabled={isPlaybackLocked || activePageIndex === 0}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onSelectPage(activePageIndex + 1)}
            disabled={isPlaybackLocked || activePageIndex === pages.length - 1}
          >
            <ChevronRight />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onDuplicateSelectedPages}
            disabled={isPlaybackLocked}
          >
            <Copy />
          </Button>
          <Button size="icon" variant="outline" onClick={onAddPage} disabled={isPlaybackLocked}>
            <Plus />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onDeleteSelectedPages}
            disabled={isPlaybackLocked || !canDeleteSelectedPages}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="lcd-editor-body">
        <label className="lcd-field">
          <span>Size</span>
          <select value={selectedScreenType} onChange={onScreenTypeChange} disabled={isPlaybackLocked}>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="lcd-editor-grid">
          <label className="lcd-field">
            <span>Mode</span>
            <select
              value={activePage.mode}
              disabled={isPlaybackLocked}
              onChange={(event) => onPageModeChange(activePageIndex, event.target.value as PageMode)}
            >
              {PAGE_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="lcd-field">
            <span>Animation</span>
            <select
              value={activePage.animation}
              disabled={isPlaybackLocked}
              onChange={(event) =>
                onPageAnimationChange(activePageIndex, event.target.value as LcdAnimation)
              }
            >
              {animationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="lcd-field">
          <span>Duration</span>
          <div className="lcd-duration-row">
            <input
              type="number"
              inputMode="decimal"
              step={activePage.durationUnit === 's' ? 0.1 : 100}
              value={durationDraft}
              disabled={isPlaybackLocked}
              onBlur={commitDurationDraft}
              onChange={(event) =>
                setDurationDraftState({
                  pageId: activePage.id,
                  unit: activePage.durationUnit,
                  value: event.target.value,
                })
              }
              onKeyDown={handleDurationKeyDown}
            />
            <select
              value={activePage.durationUnit}
              disabled={isPlaybackLocked}
              onChange={(event) => {
                onDurationUnitChange(activePageIndex, event.target.value as DurationUnit)
              }}
            >
              {DURATION_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        {activePage.mode === 'scroll' ? (
          <div className="lcd-scroll-fields">
            {activePage.rowTexts.map((rowText, rowIndex) => (
              <label key={`${activePage.id}-${rowIndex}`} className="lcd-field">
                <span>{`Row ${rowIndex + 1}`}</span>
                <input
                  type="text"
                  value={rowText}
                  disabled={isPlaybackLocked}
                  onChange={(event) => onRowTextChange(activePageIndex, rowIndex, event.target.value)}
                  placeholder={`Row ${rowIndex + 1}`}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="lcd-field lcd-text-field">
            <span className="lcd-field-heading-row">
              <span>Text</span>
              <span ref={specialTextAnchorRef} className="lcd-special-text-anchor">
                <button
                  type="button"
                  className={`lcd-special-text-toggle${isSpecialTextOpen ? ' lcd-special-text-toggle-active' : ''}`}
                  onClick={toggleSpecialTextPanel}
                  disabled={isPlaybackLocked}
                  aria-label={isSpecialTextOpen ? 'Hide special text' : 'Show special text'}
                  aria-expanded={isSpecialTextOpen}
                  title="Special text"
                >
                  <SmilePlus aria-hidden="true" />
                </button>
                {isSpecialTextPanelVisible ? (
                  <div
                    className={`lcd-special-text-panel ${
                      specialTextPanelState === 'closing' ? 'lcd-special-text-panel-closing' : ''
                    }`}
                    aria-label="Special text"
                  >
                    <div className="lcd-special-text-tabs" role="tablist" aria-label="Special text modes">
                      <button
                        type="button"
                        className={`lcd-special-text-tab${specialTextTab === 'chars' ? ' lcd-special-text-tab-active' : ''}`}
                        onClick={() => setSpecialTextTab('chars')}
                        role="tab"
                        aria-selected={specialTextTab === 'chars'}
                      >
                        Chars
                      </button>
                      <button
                        type="button"
                        className={`lcd-special-text-tab${specialTextTab === 'emoji' ? ' lcd-special-text-tab-active' : ''}`}
                        onClick={() => setSpecialTextTab('emoji')}
                        role="tab"
                        aria-selected={specialTextTab === 'emoji'}
                      >
                        Emoji
                      </button>
                    </div>
                    {specialTextTab === 'chars' ? (
                      SPECIAL_TEXT_GROUPS.map((group) => (
                        <div key={group.label} className="lcd-special-text-group">
                          <span className="lcd-special-text-group-label">{group.label}</span>
                          <div className="lcd-special-text-grid">
                            {group.items.map((item) => (
                              <button
                                key={`${group.label}-${item.label}`}
                                type="button"
                                className="lcd-special-text-item"
                                onClick={() => insertSpecialText(item.display)}
                                disabled={isPlaybackLocked}
                                title={`${item.label} / code ${item.code}`}
                                aria-label={`${item.label}, code ${item.code}`}
                              >
                                {item.display}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      CUSTOM_EMOJI_GROUPS.map((group) => (
                        <div key={group.label} className="lcd-special-text-group">
                          <span className="lcd-special-text-group-label">{group.label}</span>
                          <div className="lcd-special-text-grid">
                            {group.items.map((item) => (
                              <button
                                key={`${group.label}-${item.label}`}
                                type="button"
                                className="lcd-special-text-item"
                                onClick={() => insertSpecialText(item.display, { isEmoji: true })}
                                disabled={isPlaybackLocked}
                                title={item.label}
                                aria-label={item.label}
                              >
                                {item.display}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </span>
            </span>
            <textarea
              ref={pageTextAreaRef}
              rows={Math.max(rows + 2, 5)}
              value={activePage.text}
              disabled={isPlaybackLocked}
              onChange={(event) => onPageTextChange(activePageIndex, event)}
              placeholder={LCD_TEXT_PLACEHOLDER}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export const LcdControlPanel = memo(LcdControlPanelComponent, (previousProps, nextProps) => {
  const shouldIgnoreActivePageIndexChange = previousProps.isPlaybackLocked && nextProps.isPlaybackLocked

  if (
    previousProps.selectedScreenType !== nextProps.selectedScreenType ||
    previousProps.columns !== nextProps.columns ||
    previousProps.rows !== nextProps.rows ||
    previousProps.isPlaybackLocked !== nextProps.isPlaybackLocked ||
    previousProps.canCloseEditor !== nextProps.canCloseEditor ||
    previousProps.presets !== nextProps.presets ||
    previousProps.pages.length !== nextProps.pages.length ||
    previousProps.selectedPageIds.length !== nextProps.selectedPageIds.length
  ) {
    return false
  }

  if (!shouldIgnoreActivePageIndexChange && previousProps.activePageIndex !== nextProps.activePageIndex) {
    return false
  }

  return previousProps.selectedPageIds.every((pageId, pageIndex) => pageId === nextProps.selectedPageIds[pageIndex]) &&
    previousProps.pages.every((page, index) => page === nextProps.pages[index])
})
