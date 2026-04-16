import type { DurationUnit, LcdAnimation, PageMode, ScreenPreset } from '@/types'

export const SCREEN_PRESETS: ScreenPreset[] = [
  { id: '16x2', label: '16 x 2', columns: 16, rows: 2 },
  { id: '20x4', label: '20 x 4', columns: 20, rows: 4 },
]

export const PAGE_MODE_OPTIONS: { value: PageMode; label: string }[] = [
  { value: 'page', label: 'Page text' },
  { value: 'scroll', label: 'Row scroll' },
]

export const PAGE_ANIMATION_OPTIONS: { value: LcdAnimation; label: string }[] = [
  { value: 'replace', label: 'Replace' },
  { value: 'typewriter', label: 'Typewriter' },
]

export const SCROLL_ANIMATION_OPTIONS: { value: LcdAnimation; label: string }[] = [
  { value: 'scroll-left', label: 'Scroll left' },
  { value: 'scroll-right', label: 'Scroll right' },
]

export const DURATION_UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
  { value: 'ms', label: 'ms' },
  { value: 's', label: 's' },
]

export const DEFAULT_DURATION_MS = 2000
export const DEFAULT_TEXT = 'Hello PixelLyric'
export const LCD_TEXT_PLACEHOLDER = 'English, numbers, and symbols like . , : - / ( ) % + ='
