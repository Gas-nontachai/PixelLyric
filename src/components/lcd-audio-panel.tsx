import { type ChangeEvent, useRef } from 'react'
import { Clock3, Music2, Pause, Play, Scissors, Trash2, Upload } from 'lucide-react'

import { Waveform } from '@/components/audio-waveform'
import { Button } from '@/components/ui/button'
import { useWaveform } from '@/hooks/use-audio-waveform'
import type { AudioActionResult, ProjectAudioTrack, ToastPosition, ToastVariant } from '@/types'

type AudioViewModel = {
  track: ProjectAudioTrack | null
  scriptDurationMs: number
  trimmedAudioDurationMs: number
  currentPageAudioStartMs: number | null
  currentPageAudioInRange: boolean
  hasCoverageGap: boolean
  overflowMs: number
  previewPositionMs: number
  previewIsPlaying: boolean
  volumePercent: number
}

type LcdAudioPanelProps = {
  audio: AudioViewModel
  isPlaybackLocked: boolean
  onImportFile: (file: File | null) => Promise<AudioActionResult>
  onPreviewSeek: (value: number) => void
  onPreviewTogglePlay: () => void
  onClear: () => void
  onTrimStartMsChange: (value: number) => AudioActionResult
  onTrimEndMsChange: (value: number) => AudioActionResult
  onShowToast: (
    message: string,
    options?: { position?: ToastPosition; variant?: ToastVariant },
  ) => void
}

function parseTimelineInput(value: string) {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  const match = /^(\d+):(\d{1,2})$/.exec(normalizedValue)

  if (!match) {
    return null
  }

  const [, minutesPart, secondsPart] = match
  const minutes = Number(minutesPart)
  const seconds = Number(secondsPart)

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
    return null
  }

  return (minutes * 60 + seconds) * 1000
}

function getPercent(value: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return (value / total) * 100
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatTimelineLabel(ms: number) {
  return formatTime(ms)
}

export function LcdAudioPanel({
  audio,
  isPlaybackLocked,
  onImportFile,
  onPreviewSeek,
  onPreviewTogglePlay,
  onClear,
  onTrimStartMsChange,
  onTrimEndMsChange,
  onShowToast,
}: LcdAudioPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const waveformData = useWaveform(audio.track?.sourceFile ?? null)
  const selectionStartPercent = audio.track
    ? getPercent(audio.track.trimStartMs, audio.track.durationMs)
    : 0
  const selectionEndPercent = audio.track
    ? getPercent(audio.track.trimEndMs, audio.track.durationMs)
    : 100
  const previewPercent = audio.track
    ? getPercent(audio.previewPositionMs, audio.track.durationMs)
    : 0

  const showAudioToast = (message: string, variant: ToastVariant = 'error') => {
    onShowToast(message, {
      position: 'top-right',
      variant,
    })
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (isPlaybackLocked) {
      event.target.value = ''
      return
    }

    const [file] = Array.from(event.target.files ?? [])
    const result = await onImportFile(file ?? null)

    if (!result.ok && result.message) {
      showAudioToast(result.message)
    }

    if (result.ok) {
      showAudioToast('MP3 imported', 'success')
    }

    event.target.value = ''
  }

  const commitTrimStartDraft = (value: string) => {
    if (isPlaybackLocked) {
      return
    }

    const track = audio.track

    if (!track) {
      return
    }

    const nextTrimStartMs = parseTimelineInput(value)

    if (nextTrimStartMs === null) {
      showAudioToast('Trim start must use m:ss format')
      return
    }

    const result = onTrimStartMsChange(nextTrimStartMs)

    if (!result.ok && result.message) {
      showAudioToast(result.message)
      return
    }

    if (result.wasClamped) {
      showAudioToast('Trim start was adjusted to stay inside the MP3')
    }
  }

  const commitTrimEndDraft = (value: string) => {
    if (isPlaybackLocked) {
      return
    }

    const track = audio.track

    if (!track) {
      return
    }

    const nextTrimEndMs = parseTimelineInput(value)

    if (nextTrimEndMs === null) {
      showAudioToast('Trim end must use m:ss format')
      return
    }

    const result = onTrimEndMsChange(nextTrimEndMs)

    if (!result.ok && result.message) {
      showAudioToast(result.message)
      return
    }

    if (result.wasClamped) {
      showAudioToast('Trim end was adjusted to stay inside the MP3')
    }
  }

  return (
    <section className="lcd-audio-panel" aria-label="Audio trim tools">
      <div className="lcd-audio-panel-header">
        <div className="lcd-audio-panel-actions">
          <input
            ref={fileInputRef}
            className="lcd-audio-file-input"
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPlaybackLocked}
          >
            <Upload />
            Import MP3
          </Button>
          <Button size="sm" variant="outline" onClick={onClear} disabled={isPlaybackLocked || !audio.track}>
            <Trash2 />
            Clear
          </Button>
          <Button size="sm" onClick={onPreviewTogglePlay} disabled={isPlaybackLocked || !audio.track}>
            {audio.previewIsPlaying ? <Pause /> : <Play />}
            {audio.previewIsPlaying ? 'Pause preview' : 'Play selection'}
          </Button>
        </div>
      </div>

      {audio.track ? (
        <>
          <div className="lcd-audio-summary-grid">
            <div className="lcd-audio-summary-card">
              <span>
                <Music2 />
                Track
              </span>
              <strong>{audio.track.name}</strong>
              <small>Total {formatTimelineLabel(audio.track.durationMs)}</small>
            </div>
            <div className="lcd-audio-summary-card">
              <span>
                <Clock3 />
                Active cut
              </span>
              <strong>{formatTimelineLabel(audio.trimmedAudioDurationMs)}</strong>
              <small>
                {formatTimelineLabel(audio.track.trimStartMs)} to {formatTimelineLabel(audio.track.trimEndMs)}
              </small>
            </div>
          </div>
          <div className="lcd-audio-trim-grid">
            <label className="lcd-field">
              <span>Trim start (m:ss)</span>
              <input
                key={`trim-start-${audio.track.trimStartMs}`}
                type="text"
                inputMode="text"
                placeholder="0:00"
                defaultValue={formatTime(audio.track.trimStartMs)}
                disabled={isPlaybackLocked}
                onBlur={(event) => commitTrimStartDraft(event.target.value)}
              />
            </label>
            <label className="lcd-field">
              <span>Trim end (m:ss)</span>
              <input
                key={`trim-end-${audio.track.trimEndMs}`}
                type="text"
                inputMode="text"
                placeholder="0:00"
                defaultValue={formatTime(audio.track.trimEndMs)}
                disabled={isPlaybackLocked}
                onBlur={(event) => commitTrimEndDraft(event.target.value)}
              />
            </label>
          </div>

          <div className="lcd-audio-slider-group">
            <div className="lcd-audio-slider-label">
              <span>
                <Scissors />
                MP3 range
              </span>
              <div className="lcd-audio-slider-meta">
                <small>Preview {formatTimelineLabel(audio.previewPositionMs)}</small>
                <strong>
                  {formatTimelineLabel(audio.track.trimStartMs)} to {formatTimelineLabel(audio.track.trimEndMs)}
                </strong>
              </div>
            </div>

            <div className="lcd-audio-range-shell">
              <Waveform
                data={waveformData}
                selectionStartPercent={selectionStartPercent}
                selectionEndPercent={selectionEndPercent}
                currentPercent={previewPercent}
                onSeek={(percent) => {
                  if (!audio.track || isPlaybackLocked) {
                    return
                  }

                  const nextPositionMs = (percent / 100) * audio.track.durationMs
                  onPreviewSeek(nextPositionMs)
                }}
              />
              <input
                className="lcd-audio-range-input lcd-audio-range-input-start"
                type="range"
                min={0}
                max={audio.track.durationMs}
                step={100}
                value={audio.track.trimStartMs}
                disabled={isPlaybackLocked}
                onChange={(event) => {
                  const result = onTrimStartMsChange(Number(event.target.value))

                  if (result.wasClamped) {
                    showAudioToast('Trim start was adjusted to stay inside the MP3')
                  }
                }}
              />
              <input
                className="lcd-audio-range-input lcd-audio-range-input-end"
                type="range"
                min={0}
                max={audio.track.durationMs}
                step={100}
                value={audio.track.trimEndMs}
                disabled={isPlaybackLocked}
                onChange={(event) => {
                  const result = onTrimEndMsChange(Number(event.target.value))

                  if (result.wasClamped) {
                    showAudioToast('Trim end was adjusted to stay inside the MP3')
                  }
                }}
              />
            </div>

            <div className="lcd-audio-range-footer">
              <span>
                <Scissors />
                Start {formatTimelineLabel(audio.track.trimStartMs)}
              </span>
              <span>
                <Music2 />
                End {formatTimelineLabel(audio.track.trimEndMs)}
              </span>
            </div>
          </div>

          {audio.hasCoverageGap ? (
            <p className="lcd-audio-note lcd-audio-note-warning">
              The LCD sequence is longer than the trimmed MP3. Playback continues on the LCD after audio stops.
            </p>
          ) : null}

          {!audio.currentPageAudioInRange ? (
            <p className="lcd-audio-note">
              This page starts after the trimmed MP3 window, so pressing play here will keep the LCD moving without audio.
            </p>
          ) : null}
        </>
      ) : (
        <p className="lcd-audio-empty-state">
          Import an MP3 to unlock trim and volume tools for this project.
        </p>
      )}
    </section>
  )
}
