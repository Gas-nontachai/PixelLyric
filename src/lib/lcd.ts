import {
  DEFAULT_DURATION_MS,
  DEFAULT_TEXT,
  SCREEN_PRESETS,
} from '@/configs/lcd'
import type {
  DurationUnit,
  LcdAnimation,
  PageScript,
  ProjectAudioTrack,
  ScreenPreset,
  ScreenPresetId,
} from '@/types'

const FALLBACK_CHAR = ' '

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

export function normalizePageText(text: string, columns: number, rows: number) {
  return autoWrapTextareaValue(text, columns, rows)
}

export function normalizeRowTexts(rowTexts: string[], rows: number) {
  const normalized = rowTexts.slice(0, rows)

  while (normalized.length < rows) {
    normalized.push('')
  }

  return normalized
}

export function getDurationValue(durationMs: number, unit: DurationUnit) {
  return unit === 's' ? durationMs / 1000 : durationMs
}

export function parseDurationInput(value: string, unit: DurationUnit) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null
  }

  const durationMs = unit === 's' ? parsedValue * 1000 : parsedValue
  return Math.round(durationMs)
}

export function formatDurationInput(durationMs: number, unit: DurationUnit) {
  const value = getDurationValue(durationMs, unit)
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

export function getScriptDurationMs(pages: PageScript[]) {
  return pages.reduce((totalDuration, page) => totalDuration + page.durationMs, 0)
}

export function getPageStartOffsetMs(pages: PageScript[], pageIndex: number) {
  if (pageIndex <= 0) {
    return 0
  }

  return pages.slice(0, pageIndex).reduce((totalDuration, page) => totalDuration + page.durationMs, 0)
}

export function getPageAudioStartMs(
  track: ProjectAudioTrack,
  pages: PageScript[],
  pageIndex: number,
) {
  return track.trimStartMs + getPageStartOffsetMs(pages, pageIndex)
}

export function getAudioTimelinePositionMs(
  track: ProjectAudioTrack,
  pages: PageScript[],
  pageIndex: number,
  pageProgressMs: number,
) {
  return getPageAudioStartMs(track, pages, pageIndex) + pageProgressMs
}

function createPage(rows: number, text: string): PageScript {
  return {
    id: crypto.randomUUID(),
    mode: 'page',
    animation: 'replace',
    durationMs: DEFAULT_DURATION_MS,
    durationUnit: 'ms',
    text,
    rowTexts: normalizeRowTexts([], rows),
  }
}

export function createInitialPage(rows: number): PageScript {
  return createPage(rows, DEFAULT_TEXT)
}

export function createBlankPage(rows: number): PageScript {
  return createPage(rows, '')
}

export function createDuplicatedPage(page: PageScript, rows: number): PageScript {
  return {
    ...page,
    id: crypto.randomUUID(),
    rowTexts: normalizeRowTexts(page.rowTexts, rows),
  }
}

function normalizeLine(line: string, columns: number) {
  return line.slice(0, columns).padEnd(columns, FALLBACK_CHAR)
}

export function textToDisplayRows(text: string, columns: number, rows: number) {
  const rawRows = text.replace(/\r/g, '').split('\n').slice(0, rows)
  const normalizedRows = rawRows.map((row) => normalizeLine(row, columns))

  while (normalizedRows.length < rows) {
    normalizedRows.push(FALLBACK_CHAR.repeat(columns))
  }

  return normalizedRows
}

function getTypewriterRows(text: string, columns: number, rows: number, progressMs: number, durationMs: number) {
  const fullRows = textToDisplayRows(text, columns, rows)
  const flattenedRows = fullRows.join('')
  const totalCharacters = flattenedRows.length
  const progressRatio = durationMs <= 0 ? 1 : Math.min(progressMs / durationMs, 1)
  const visibleCharacters = Math.ceil(progressRatio * totalCharacters)
  const visibleText = flattenedRows
    .slice(0, visibleCharacters)
    .padEnd(totalCharacters, FALLBACK_CHAR)

  return Array.from({ length: rows }, (_, rowIndex) =>
    visibleText.slice(rowIndex * columns, rowIndex * columns + columns),
  )
}

function getScrollWindow(rowText: string, columns: number, animation: LcdAnimation, progressMs: number, durationMs: number) {
  const paddedText = `${FALLBACK_CHAR.repeat(columns)}${rowText}${FALLBACK_CHAR.repeat(columns)}`
  const totalWindows = Math.max(1, paddedText.length - columns + 1)
  const progressRatio = durationMs <= 0 ? 1 : Math.min(progressMs / durationMs, 1)
  const maxOffset = totalWindows - 1
  const offset = Math.round(progressRatio * maxOffset)
  const windowStart = animation === 'scroll-right' ? maxOffset - offset : offset

  return normalizeLine(paddedText.slice(windowStart, windowStart + columns), columns)
}

export function getVisibleRows(page: PageScript, preset: ScreenPreset, progressMs: number) {
  if (page.mode === 'scroll') {
    return normalizeRowTexts(page.rowTexts, preset.rows).map((rowText) =>
      getScrollWindow(rowText, preset.columns, page.animation, progressMs, page.durationMs),
    )
  }

  const normalizedText = normalizePageText(page.text, preset.columns, preset.rows)

  if (page.animation === 'typewriter') {
    return getTypewriterRows(normalizedText, preset.columns, preset.rows, progressMs, page.durationMs)
  }

  return textToDisplayRows(normalizedText, preset.columns, preset.rows)
}
