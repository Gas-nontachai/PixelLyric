export function formatAudioSeconds(ms: number) {
  const seconds = ms / 1000
  return Number.isInteger(seconds) ? `${seconds}` : seconds.toFixed(1).replace(/\.0$/, '')
}

export function formatAudioTimelineLabel(ms: number) {
  return `${formatAudioSeconds(ms)}s`
}
