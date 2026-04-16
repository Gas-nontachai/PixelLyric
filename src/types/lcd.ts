export type ScreenPresetId = '16x2' | '20x4'

export type ScreenPreset = {
  id: ScreenPresetId
  label: string
  columns: number
  rows: number
}

export type PageMode = 'page' | 'scroll'
export type LcdAnimation = 'replace' | 'typewriter' | 'scroll-left' | 'scroll-right'
export type DurationUnit = 'ms' | 's'

export type PageScript = {
  id: string
  mode: PageMode
  animation: LcdAnimation
  durationMs: number
  durationUnit: DurationUnit
  text: string
  rowTexts: string[]
}
