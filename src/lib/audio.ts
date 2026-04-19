export const MAX_AUDIO_DURATION_MS = 5 * 60 * 1000

export function formatAudioSeconds(ms: number) {
  const seconds = ms / 1000
  return Number.isInteger(seconds) ? `${seconds}` : seconds.toFixed(1).replace(/\.0$/, '')
}

export function formatAudioTimelineLabel(ms: number) {
  return `${formatAudioSeconds(ms)}s`
}

export function isAudioDurationWithinLimit(durationMs: number) {
  return Number.isFinite(durationMs) && durationMs <= MAX_AUDIO_DURATION_MS
}
