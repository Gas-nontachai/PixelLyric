import { memo, useState } from 'react'
import { Hourglass, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type LcdPlaybackBarProps = {
  countdownRemaining: number | null
  countdownSeconds: 0 | 3 | 5 | 10
  hasAudio: boolean
  isLooping: boolean
  isPlaybackLocked: boolean
  isPlaying: boolean
  volumePercent: number
  onCountdownCycle: () => void
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onPrev: () => void
  onRestart: () => void
  onToggleLoop: () => void
  onVolumeChange: (value: number) => void
}

function LcdPlaybackBarComponent({
  countdownRemaining,
  countdownSeconds,
  hasAudio,
  isLooping,
  isPlaybackLocked,
  isPlaying,
  volumePercent,
  onCountdownCycle,
  onNext,
  onPause,
  onPlay,
  onPrev,
  onRestart,
  onToggleLoop,
  onVolumeChange,
}: LcdPlaybackBarProps) {
  const isActive = isPlaying || countdownRemaining !== null
  const countdownLabel = countdownSeconds === 0 ? 'Off' : `${countdownSeconds}s`
  const [isVolumeOpen, setIsVolumeOpen] = useState(false)
  const [isVolumeDragging, setIsVolumeDragging] = useState(false)
  const [volumeDraft, setVolumeDraft] = useState(volumePercent)
  const displayedVolume = isVolumeDragging ? volumeDraft : volumePercent

  const handleVolumeInput = (nextValue: number) => {
    setVolumeDraft(nextValue)
    onVolumeChange(nextValue)
  }

  return (
    <div className="lcd-playback-bar">
      <Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous page" disabled={isPlaybackLocked}>
        <SkipBack />
      </Button>
      <Button
        size="icon"
        variant={isActive ? 'outline' : 'default'}
        onClick={isActive ? onPause : onPlay}
        aria-label={isActive ? 'Pause playback' : 'Play playback'}
      >
        {isActive ? <Pause /> : <Play />}
      </Button>
      <Button size="icon" variant="outline" onClick={onNext} aria-label="Next page" disabled={isPlaybackLocked}>
        <SkipForward />
      </Button>
      <Button size="icon" variant="outline" onClick={onRestart} aria-label="Restart page" disabled={isPlaybackLocked}>
        <RotateCcw />
      </Button>
      <Button
        size="sm"
        variant={isLooping ? 'secondary' : 'outline'}
        onClick={onToggleLoop}
        aria-pressed={isLooping}
        disabled={isPlaybackLocked}
      >
        {isLooping ? 'Loop' : 'Once'}
      </Button>
      <Button
        size="sm"
        variant={countdownSeconds === 0 ? 'outline' : 'secondary'}
        onClick={onCountdownCycle}
        aria-label={`Countdown ${countdownLabel}`}
        disabled={isPlaybackLocked}
      >
        <Hourglass />
        {countdownLabel}
      </Button>

      {hasAudio ? (
        <div className={`lcd-playback-volume-toggle${isVolumeOpen ? ' lcd-playback-volume-toggle-open' : ''}`}>
          <Button
            size="icon"
            variant={isVolumeOpen ? 'secondary' : 'outline'}
            className="lcd-playback-volume-button"
            onClick={() => setIsVolumeOpen((currentValue) => !currentValue)}
            aria-label={isVolumeOpen ? 'Hide volume slider' : 'Show volume slider'}
            aria-expanded={isVolumeOpen}
          >
            <Volume2 />
          </Button>

          <div
            className={`lcd-playback-volume-slider-shell${isVolumeOpen ? ' lcd-playback-volume-slider-shell-open' : ''}`}
            aria-hidden={!isVolumeOpen}
          >
            <div className="lcd-playback-volume-slider-track">
              <div
                className="lcd-playback-volume-slider-fill"
                style={{ transform: `scaleX(${displayedVolume / 100})` }}
              />
              <input
                className="lcd-playback-volume-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={displayedVolume}
                onChange={(event) => handleVolumeInput(Number(event.target.value))}
                onInput={(event) => handleVolumeInput(Number((event.target as HTMLInputElement).value))}
                onMouseDown={() => {
                  setVolumeDraft(volumePercent)
                  setIsVolumeDragging(true)
                }}
                onMouseUp={() => setIsVolumeDragging(false)}
                onTouchStart={() => {
                  setVolumeDraft(volumePercent)
                  setIsVolumeDragging(true)
                }}
                onTouchEnd={() => setIsVolumeDragging(false)}
                onBlur={() => setIsVolumeDragging(false)}
                aria-label="Audio volume"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export const LcdPlaybackBar = memo(LcdPlaybackBarComponent, (previousProps, nextProps) => {
  return (
    previousProps.countdownRemaining === nextProps.countdownRemaining &&
    previousProps.countdownSeconds === nextProps.countdownSeconds &&
    previousProps.hasAudio === nextProps.hasAudio &&
    previousProps.isLooping === nextProps.isLooping &&
    previousProps.isPlaybackLocked === nextProps.isPlaybackLocked &&
    previousProps.isPlaying === nextProps.isPlaying &&
    previousProps.volumePercent === nextProps.volumePercent
  )
})
