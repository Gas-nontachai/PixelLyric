import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

import { Button } from '@/components/ui/button'

type LcdPlaybackBarProps = {
  isLooping: boolean
  isPlaying: boolean
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onPrev: () => void
  onRestart: () => void
  onToggleLoop: () => void
}

export function LcdPlaybackBar({
  isLooping,
  isPlaying,
  onNext,
  onPause,
  onPlay,
  onPrev,
  onRestart,
  onToggleLoop,
}: LcdPlaybackBarProps) {
  return (
    <div className="lcd-playback-bar">
      <Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous page">
        <SkipBack />
      </Button>
      <Button
        size="icon"
        variant={isPlaying ? 'outline' : 'default'}
        onClick={isPlaying ? onPause : onPlay}
        aria-label={isPlaying ? 'Pause playback' : 'Play playback'}
      >
        {isPlaying ? <Pause /> : <Play />}
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
    </div>
  )
}
