import { type ChangeEvent, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'

import { LcdAudioPanel } from '@/components/lcd-audio-panel'
import { LcdDisplay } from '@/components/lcd-display'
import { LcdPlaybackBar } from '@/components/lcd-playback-bar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import type { ProjectAudioTrack } from '@/lib/lcd'
import type { ToastPosition, ToastVariant } from '@/hooks/use-toast'

type AudioActionResult = {
  ok: boolean
  message?: string
  wasClamped?: boolean
}

type PreviewAudioState = {
  track: ProjectAudioTrack | null
  scriptDurationMs: number
  trimmedAudioDurationMs: number
  currentPageAudioStartMs: number | null
  currentPageAudioInRange: boolean
  hasCoverageGap: boolean
  overflowMs: number
  previewPositionMs: number
  previewIsPlaying: boolean
}

type LcdPreviewStageProps = {
  audio: PreviewAudioState
  columns: number
  countdownRemaining: number | null
  countdownSeconds: 0 | 3 | 5 | 10
  rows: number
  displayRows: string[]
  isEditorOpen: boolean
  isLooping: boolean
  isPlaybackLocked: boolean
  isPlaying: boolean
  onAudioClear: () => void
  onAudioImport: (file: File | null) => Promise<AudioActionResult>
  onAudioPreviewSeek: (value: number) => void
  onAudioPreviewTogglePlay: () => void
  onAudioTrimEndChange: (value: number) => AudioActionResult
  onAudioTrimStartChange: (value: number) => AudioActionResult
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onPrev: () => void
  onRestart: () => void
  onShowToast: (
    message: string,
    options?: { position?: ToastPosition; variant?: ToastVariant },
  ) => void
  onToggleEditor: () => void
  onToggleLoop: () => void
  onCountdownCycle: () => void
}

export function LcdPreviewStage({
  audio,
  columns,
  countdownRemaining,
  countdownSeconds,
  rows,
  displayRows,
  isEditorOpen,
  isLooping,
  isPlaybackLocked,
  isPlaying,
  onAudioClear,
  onAudioImport,
  onAudioPreviewSeek,
  onAudioPreviewTogglePlay,
  onAudioTrimEndChange,
  onAudioTrimStartChange,
  onNext,
  onPause,
  onPlay,
  onPrev,
  onRestart,
  onShowToast,
  onToggleEditor,
  onToggleLoop,
  onCountdownCycle,
}: LcdPreviewStageProps) {
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleAudioFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (isPlaybackLocked) {
      event.target.value = ''
      return
    }

    const [file] = Array.from(event.target.files ?? [])
    const result = await onAudioImport(file ?? null)

    if (!result.ok && result.message) {
      onShowToast(result.message, {
        position: 'top-right',
        variant: 'error',
      })
    }

    if (result.ok) {
      setIsAudioPanelOpen(true)
      onShowToast('MP3 imported', {
        position: 'top-right',
        variant: 'success',
      })
    }

    event.target.value = ''
  }

  const handleToggleAudioDialog = () => {
    if (isPlaybackLocked) {
      return
    }

    if (!audio.track) {
      fileInputRef.current?.click()
      return
    }

    setIsAudioPanelOpen((currentValue) => !currentValue)
  }

  return (
    <section className="lcd-preview-panel">
      <div className="lcd-preview-shell">
        <input
          ref={fileInputRef}
          className="lcd-audio-file-input"
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleAudioFileChange}
        />

        <div className="lcd-preview-header">
          <h1>PixelLyric</h1>
          <Button
            size="icon"
            variant="outline"
            className="lcd-toggle-button"
            onClick={onToggleEditor}
            aria-label={isEditorOpen ? 'Hide editor' : 'Show editor'}
            disabled={isPlaybackLocked}
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

        <div className="flex justify-center">
          {audio.track ? (
            <>
              <span className="lcd-audio-tab-title">
                Now Playing:
                <span className="lcd-audio-tab-value">
                  {audio.track.name}
                </span>
              </span>
            </>
          ) : null}
        </div>

        <LcdPlaybackBar
          countdownRemaining={countdownRemaining}
          countdownSeconds={countdownSeconds}
          hasAudio={Boolean(audio.track)}
          isAudioPanelOpen={isAudioPanelOpen}
          isLooping={isLooping}
          isPlaybackLocked={isPlaybackLocked}
          isPlaying={isPlaying}
          onNext={onNext}
          onPause={onPause}
          onPlay={onPlay}
          onPrev={onPrev}
          onRestart={onRestart}
          onToggleAudioPanel={handleToggleAudioDialog}
          onToggleLoop={onToggleLoop}
          onCountdownCycle={onCountdownCycle}
        />

        <Dialog
          open={isAudioPanelOpen}
          onOpenChange={setIsAudioPanelOpen}
          title="MP3 timeline"
        >
          <LcdAudioPanel
            audio={audio}
            isPlaybackLocked={isPlaybackLocked}
            onImportFile={onAudioImport}
            onPreviewSeek={onAudioPreviewSeek}
            onPreviewTogglePlay={onAudioPreviewTogglePlay}
            onClear={onAudioClear}
            onTrimStartMsChange={onAudioTrimStartChange}
            onTrimEndMsChange={onAudioTrimEndChange}
            onShowToast={onShowToast}
          />
        </Dialog>
      </div>
    </section>
  )
}
