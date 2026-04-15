export type ScreenPresetId = '16x2' | '20x4'

export type ScreenPreset = {
  id: ScreenPresetId
  label: string
  columns: number
  rows: number
}

export const SCREEN_PRESETS: ScreenPreset[] = [
  { id: '16x2', label: '16 x 2', columns: 16, rows: 2 },
  { id: '20x4', label: '20 x 4', columns: 20, rows: 4 },
]

export const DEFAULT_TEXT = 'HELLO PixelLyric\nLCD DEMO'
export const LCD_TEXT_PLACEHOLDER = 'English, numbers, and symbols like . , : - / ( ) % + ='

export function getPresetById(id: ScreenPresetId) {
  return SCREEN_PRESETS.find((preset) => preset.id === id) ?? SCREEN_PRESETS[0]
}

export function autoWrapTextareaValue(text: string, columns: number, rows: number) {
  const source = text.replace(/\r/g, '')
  const output: string[] = []
  let currentLineLength = 0
  let lineCount = 1
  let justWrapped = false

  for (const char of source) {
    if (lineCount > rows) {
      break
    }

    if (char === '\n') {
      if (justWrapped) {
        justWrapped = false
        continue
      }

      if (lineCount === rows) {
        break
      }

      output.push('\n')
      currentLineLength = 0
      lineCount += 1
      justWrapped = false
      continue
    }

    output.push(char)
    currentLineLength += 1
    justWrapped = false

    if (currentLineLength === columns && lineCount < rows) {
      output.push('\n')
      currentLineLength = 0
      lineCount += 1
      justWrapped = true
    }

    if (lineCount === rows && currentLineLength === columns) {
      break
    }
  }

  return output.join('')
}
