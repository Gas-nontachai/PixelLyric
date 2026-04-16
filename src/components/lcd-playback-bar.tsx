import { memo } from 'react'
import { Hourglass, Music2, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

import { Button } from '@/components/ui/button'

type LcdPlaybackBarProps = {
  countdownRemaining: number | null
  countdownSeconds: 0 | 3 | 5 | 10
  hasAudio: boolean
  isAudioPanelOpen: boolean
  isLooping: boolean
  isPlaying: boolean
  onCountdownCycle: () => void
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onPrev: () => void
  onRestart: () => void
  onToggleAudioPanel: () => void
  onToggleLoop: () => void
}

function LcdPlaybackBarComponent({
  countdownRemaining,
  countdownSeconds,
  hasAudio,
  isAudioPanelOpen,
  isLooping,
  isPlaying,
  onCountdownCycle,
  onNext,
  onPause,
  onPlay,
  onPrev,
  onRestart,
  onToggleAudioPanel,
  onToggleLoop,
}: LcdPlaybackBarProps) {
  const isActive = isPlaying || countdownRemaining !== null
  const countdownLabel = countdownSeconds === 0 ? 'Off' : `${countdownSeconds}s`

  return (
    <div className="lcd-playback-bar">
      <Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous page">
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
      <Button size="icon" variant="outline" onClick={onNext} aria-label="Next page">
        <SkipForward />
      </Button>
      <Button size="icon" variant="outline" onClick={onRestart} aria-label="Restart page">
        <RotateCcw />
      </Button>
      <Button
        size="icon"
        variant={isAudioPanelOpen ? 'secondary' : 'outline'}
        className={hasAudio ? 'lcd-playback-audio-button-loaded' : ''}
        onClick={onToggleAudioPanel}
        aria-label={isAudioPanelOpen ? 'Hide MP3 dialog' : 'Show MP3 dialog'}
        aria-pressed={isAudioPanelOpen}
      >
        <Music2 />
      </Button>
      <Button
        size="sm"
        variant={isLooping ? 'secondary' : 'outline'}
        onClick={onToggleLoop}
        aria-pressed={isLooping}
      >
        {isLooping ? 'Loop' : 'Once'}
      </Button>
      <Button
        size="sm"
        variant={countdownSeconds === 0 ? 'outline' : 'secondary'}
        onClick={onCountdownCycle}
        aria-label={`Countdown ${countdownLabel}`}
      >
        <Hourglass />
        {countdownLabel}
      </Button>
    </div>
  )
}

export const LcdPlaybackBar = memo(LcdPlaybackBarComponent, (previousProps, nextProps) => {
  return (
    previousProps.countdownRemaining === nextProps.countdownRemaining &&
    previousProps.countdownSeconds === nextProps.countdownSeconds &&
    previousProps.hasAudio === nextProps.hasAudio &&
    previousProps.isAudioPanelOpen === nextProps.isAudioPanelOpen &&
    previousProps.isLooping === nextProps.isLooping &&
    previousProps.isPlaying === nextProps.isPlaying
  )
})
