import { describe, expect, it } from 'vitest'

import {
  formatAudioSeconds,
  formatAudioTimelineLabel,
  isAudioDurationWithinLimit,
  MAX_AUDIO_DURATION_MS,
} from '@/lib/audio'

describe('audio utilities', () => {
  it('formats integer and decimal seconds without trailing zero noise', () => {
    expect(formatAudioSeconds(2000)).toBe('2')
    expect(formatAudioSeconds(1250)).toBe('1.3')
    expect(formatAudioSeconds(1500)).toBe('1.5')
  })

  it('formats timeline labels with a seconds suffix', () => {
    expect(formatAudioTimelineLabel(2500)).toBe('2.5s')
  })

  it('accepts only finite durations within the configured limit', () => {
    expect(isAudioDurationWithinLimit(0)).toBe(true)
    expect(isAudioDurationWithinLimit(MAX_AUDIO_DURATION_MS)).toBe(true)
    expect(isAudioDurationWithinLimit(MAX_AUDIO_DURATION_MS + 1)).toBe(false)
    expect(isAudioDurationWithinLimit(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isAudioDurationWithinLimit(Number.NaN)).toBe(false)
  })
})