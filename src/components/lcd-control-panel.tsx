import { memo, type ChangeEvent, type KeyboardEvent, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DURATION_UNIT_OPTIONS,
  LCD_TEXT_PLACEHOLDER,
  PAGE_ANIMATION_OPTIONS,
  PAGE_MODE_OPTIONS,
  SCROLL_ANIMATION_OPTIONS,
  formatDurationInput,
  type DurationUnit,
  type LcdAnimation,
  type PageMode,
  type PageScript,
  type ScreenPreset,
  type ScreenPresetId,
} from '@/lib/lcd'
import type { ToastPosition, ToastVariant } from '@/hooks/use-toast'

type LcdControlPanelProps = {
  presets: ScreenPreset[]
  selectedScreenType: ScreenPresetId
  columns: number
  rows: number
  pages: PageScript[]
  activePageIndex: number
  isPlaybackLocked: boolean
  canCloseEditor: boolean
  onCloseEditor: () => void
  onScreenTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onSelectPage: (pageIndex: number) => void
  onAddPage: () => void
  onDuplicatePage: (pageIndex: number) => void
  onDeletePage: (pageIndex: number) => void
  onPageModeChange: (pageIndex: number, mode: PageMode) => void
  onPageAnimationChange: (pageIndex: number, animation: LcdAnimation) => void
  onPageTextChange: (pageIndex: number, event: ChangeEvent<HTMLTextAreaElement>) => void
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
  rows,
  pages,
  activePageIndex,
  isPlaybackLocked,
  canCloseEditor,
  onCloseEditor,
  onScreenTypeChange,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onPageModeChange,
  onPageAnimationChange,
  onPageTextChange,
  onRowTextChange,
  onDurationValueChange,
  onDurationUnitChange,
  onShowToast,
}: LcdControlPanelProps) {
  const activePage = pages[activePageIndex]
  const animationOptions =
    activePage.mode === 'scroll' ? SCROLL_ANIMATION_OPTIONS : PAGE_ANIMATION_OPTIONS
  const formattedDuration = formatDurationInput(activePage.durationMs, activePage.durationUnit)
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
              className={`lcd-editor-tab${pageIndex === activePageIndex ? ' lcd-editor-tab-active' : ''}`}
              onClick={() => onSelectPage(pageIndex)}
              disabled={isPlaybackLocked}
              role="tab"
              aria-selected={pageIndex === activePageIndex}
            >
              {pageIndex + 1}
            </button>
          ))}
        </div>

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
          <Button size="icon" variant="outline" onClick={() => onDuplicatePage(activePageIndex)} disabled={isPlaybackLocked}>
            <Copy />
          </Button>
          <Button size="icon" variant="outline" onClick={onAddPage} disabled={isPlaybackLocked}>
            <Plus />
          </Button>
          <Button size="icon" variant="outline" onClick={() => onDeletePage(activePageIndex)} disabled={isPlaybackLocked || pages.length === 1}>
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
          <label className="lcd-field">
            <span>Text</span>
            <textarea
              rows={Math.max(rows + 2, 5)}
              value={activePage.text}
              disabled={isPlaybackLocked}
              onChange={(event) => onPageTextChange(activePageIndex, event)}
              placeholder={LCD_TEXT_PLACEHOLDER}
              spellCheck={false}
            />
          </label>
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
    previousProps.pages.length !== nextProps.pages.length
  ) {
    return false
  }

  if (!shouldIgnoreActivePageIndexChange && previousProps.activePageIndex !== nextProps.activePageIndex) {
    return false
  }

  return previousProps.pages.every((page, index) => page === nextProps.pages[index])
})
