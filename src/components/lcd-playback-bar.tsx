import { Hourglass, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

import { Button } from '@/components/ui/button'

type LcdPlaybackBarProps = {
  countdownRemaining: number | null
  countdownSeconds: 0 | 3 | 5 | 10
  isLooping: boolean
  isPlaying: boolean
  onCountdownCycle: () => void
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onPrev: () => void
  onRestart: () => void
  onToggleLoop: () => void
}

export function LcdPlaybackBar({
  countdownRemaining,
  countdownSeconds,
  isLooping,
  isPlaying,
  onCountdownCycle,
  onNext,
  onPause,
  onPlay,
  onPrev,
  onRestart,
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
