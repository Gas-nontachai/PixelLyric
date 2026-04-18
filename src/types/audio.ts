export type ProjectAudioTrack = {
  name: string
  sourceFile: File
  objectUrl: string
  durationMs: number
  trimStartMs: number
  trimEndMs: number
  volumePercent: number
}

export type AudioPreviewState = {
  isPlaying: boolean
  positionMs: number
}

export type AudioActionResult = {
  ok: boolean
  message?: string
  wasClamped?: boolean
}

export type AudioViewModel = {
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
