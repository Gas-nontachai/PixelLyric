import { Pencil } from 'lucide-react'

import { LcdDisplay } from '@/components/lcd-display'
import { LcdPlaybackBar } from '@/components/lcd-playback-bar'
import { Button } from '@/components/ui/button'

type LcdPreviewStageProps = {
  columns: number
  countdownRemaining: number | null
  countdownSeconds: 0 | 3 | 5 | 10
  rows: number
  displayRows: string[]
  isEditorOpen: boolean
  isLooping: boolean
  isPlaying: boolean
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onPrev: () => void
  onRestart: () => void
  onToggleEditor: () => void
  onToggleLoop: () => void
  onCountdownCycle: () => void
}

export function LcdPreviewStage({
  columns,
  countdownRemaining,
  countdownSeconds,
  rows,
  displayRows,
  isEditorOpen,
  isLooping,
  isPlaying,
  onNext,
  onPause,
  onPlay,
  onPrev,
  onRestart,
  onToggleEditor,
  onToggleLoop,
  onCountdownCycle,
}: LcdPreviewStageProps) {
  return (
    <section className="lcd-preview-panel">
      <div className="lcd-preview-shell">
        <div className="lcd-preview-header">
          <h1>PixelLyric</h1>
          <Button
            size="icon"
            variant="outline"
            className="lcd-toggle-button"
            onClick={onToggleEditor}
            aria-label={isEditorOpen ? 'Hide editor' : 'Show editor'}
          >
            <Pencil />
          </Button>
        </div>

        <div className="lcd-preview-board-wrap">
          {countdownRemaining !== null ? (
            <div className="lcd-countdown-overlay">{countdownRemaining}</div>
          ) : null}
          <LcdDisplay columns={columns} rows={rows} displayRows={displayRows} />
        </div>

        <LcdPlaybackBar
          countdownRemaining={countdownRemaining}
          countdownSeconds={countdownSeconds}
          isLooping={isLooping}
          isPlaying={isPlaying}
          onNext={onNext}
          onPause={onPause}
          onPlay={onPlay}
          onPrev={onPrev}
          onRestart={onRestart}
          onToggleLoop={onToggleLoop}
          onCountdownCycle={onCountdownCycle}
        />
      </div>
    </section>
  )
}
