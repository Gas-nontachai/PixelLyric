import { describe, expect, it } from 'vitest'

import { CUSTOM_EMOJI_GROUPS, CUSTOM_EMOJI_ITEMS } from '@/configs/custom-emoji'
import { DEFAULT_DURATION_MS, DEFAULT_TEXT } from '@/configs/lcd'
import { FONT } from '@/configs/lcd-font'
import { SPECIAL_TEXT_GROUPS, SPECIAL_TEXT_ITEMS } from '@/configs/special-text'
import {
  autoWrapTextareaValue,
  createBlankPage,
  createDefaultPages,
  createDuplicatedPage,
  createInitialPage,
  formatDurationInput,
  getAudioTimelinePositionMs,
  getDurationValue,
  getPageAudioStartMs,
  getPageStartOffsetMs,
  getPresetById,
  getScriptDurationMs,
  getVisibleRows,
  normalizePageText,
  normalizeRowTexts,
  parseDurationInput,
  textToDisplayRows,
} from '@/lib/lcd'
import type { PageScript, ProjectAudioTrack, ScreenPreset } from '@/types'

const SMALL_PRESET: ScreenPreset = {
  id: '16x2',
  label: 'Small',
  columns: 4,
  rows: 2,
}

function createPage(overrides: Partial<PageScript> = {}): PageScript {
  return {
    animation: 'replace',
    durationMs: 1000,
    durationUnit: 'ms',
    id: 'page-1',
    mode: 'page',
    rowTexts: ['', ''],
    text: 'ABCD',
    ...overrides,
  }
}

describe('lcd utilities', () => {
  it('returns the requested preset and falls back to the default preset', () => {
    expect(getPresetById('20x4').columns).toBe(20)
    expect(getPresetById('missing' as never).id).toBe('16x2')
  })

  it('auto-wraps text, strips carriage returns, and avoids duplicate newlines after wrapping', () => {
    expect(autoWrapTextareaValue('AB\rCD', 4, 2)).toBe('ABCD\n')
    expect(autoWrapTextareaValue('ABCD\nEFGH', 4, 2)).toBe('ABCD\nEFGH')
    expect(autoWrapTextareaValue('ABCDEFGHI', 4, 2)).toBe('ABCD\nEFGH')
    expect(normalizePageText('ABCDEFGHI', 4, 2)).toBe('ABCD\nEFGH')
  })

  it('pads and truncates row text arrays to the available row count', () => {
    expect(normalizeRowTexts(['one'], 3)).toEqual(['one', '', ''])
    expect(normalizeRowTexts(['one', 'two', 'three'], 2)).toEqual(['one', 'two'])
  })

  it('parses and formats duration inputs across ms and seconds units', () => {
    expect(getDurationValue(2500, 's')).toBe(2.5)
    expect(getDurationValue(2500, 'ms')).toBe(2500)
    expect(parseDurationInput('2.5', 's')).toBe(2500)
    expect(parseDurationInput('2500.4', 'ms')).toBe(2500)
    expect(parseDurationInput('0', 'ms')).toBeNull()
    expect(parseDurationInput('nope', 's')).toBeNull()
    expect(formatDurationInput(2500, 's')).toBe('2.5')
    expect(formatDurationInput(2000, 's')).toBe('2')
    expect(formatDurationInput(2500, 'ms')).toBe('2500')
  })

  it('computes script and audio timeline offsets from page durations', () => {
    const pages = [
      createPage({ durationMs: 500 }),
      createPage({ id: 'page-2', durationMs: 700 }),
      createPage({ id: 'page-3', durationMs: 900 }),
    ]
    const track = {
      durationMs: 4000,
      name: 'Track',
      objectUrl: 'blob:track',
      sourceFile: new File(['a'], 'track.mp3', { type: 'audio/mpeg' }),
      trimEndMs: 3000,
      trimStartMs: 250,
      volumePercent: 100,
    } satisfies ProjectAudioTrack

    expect(getScriptDurationMs(pages)).toBe(2100)
    expect(getPageStartOffsetMs(pages, 0)).toBe(0)
    expect(getPageStartOffsetMs(pages, 2)).toBe(1200)
    expect(getPageAudioStartMs(track, pages, 2)).toBe(1450)
    expect(getAudioTimelinePositionMs(track, pages, 2, 300)).toBe(1750)
  })

  it('creates initial, blank, and duplicated pages with normalized rows', () => {
    const initialPage = createInitialPage(2)
    const blankPage = createBlankPage(3)
    const defaultPages = createDefaultPages(2)
    const duplicatedPage = createDuplicatedPage(
      createPage({ id: 'original', rowTexts: ['top'] }),
      2,
    )

    expect(defaultPages).toHaveLength(2)
    expect(defaultPages[0]).toMatchObject({
      text: 'hello',
      durationMs: 1000,
      durationUnit: 'ms',
      rowTexts: ['', ''],
    })
    expect(defaultPages[1]).toMatchObject({
      text: 'Pixelyric',
      durationMs: 1000,
      durationUnit: 'ms',
      rowTexts: ['', ''],
    })
    expect(initialPage.text).toBe(DEFAULT_TEXT)
    expect(initialPage.durationMs).toBe(DEFAULT_DURATION_MS)
    expect(initialPage.rowTexts).toEqual(['', ''])
    expect(blankPage.text).toBe('')
    expect(blankPage.rowTexts).toEqual(['', '', ''])
    expect(duplicatedPage.id).not.toBe('original')
    expect(duplicatedPage.rowTexts).toEqual(['top', ''])
  })

  it('normalizes display rows for replace pages', () => {
    expect(textToDisplayRows('HELLO\nX', 4, 3)).toEqual(['HELL', 'X   ', '    '])

    const visibleRows = getVisibleRows(
      createPage({ text: 'HELLO\nX' }),
      { ...SMALL_PRESET, rows: 3 },
      0,
    )

    expect(visibleRows).toEqual(['HELL', 'O   ', 'X   '])
  })

  it('reveals typewriter rows based on playback progress', () => {
    const visibleRows = getVisibleRows(
      createPage({ animation: 'typewriter', text: 'AB\nCD' }),
      SMALL_PRESET,
      250,
    )

    expect(visibleRows).toEqual(['AB  ', '    '])
    expect(getVisibleRows(
      createPage({ animation: 'typewriter', text: 'AB\nCD' }),
      SMALL_PRESET,
      1000,
    )).toEqual(['AB  ', 'CD  '])
  })

  it('renders scroll pages from left and right directions', () => {
    const scrollLeftRows = getVisibleRows(
      createPage({
        animation: 'scroll-left',
        mode: 'scroll',
        rowTexts: ['HELLO', 'BYE'],
        text: '',
      }),
      SMALL_PRESET,
      875,
    )

    const scrollRightRows = getVisibleRows(
      createPage({
        animation: 'scroll-right',
        mode: 'scroll',
        rowTexts: ['HELLO', 'BYE'],
        text: '',
      }),
      SMALL_PRESET,
      125,
    )

    expect(scrollLeftRows).toEqual(['O   ', 'E   '])
    expect(scrollRightRows).toEqual(['O   ', 'E   '])
  })

  it('keeps the special text registry valid and grouped for the picker', () => {
    const displays = SPECIAL_TEXT_ITEMS.map((item) => item.display)
    const groupedItems = SPECIAL_TEXT_GROUPS.flatMap((group) => group.items)

    expect(new Set(displays).size).toBe(displays.length)
    expect(groupedItems).toEqual(SPECIAL_TEXT_ITEMS)

    for (const item of SPECIAL_TEXT_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.display).toHaveLength(1)
      expect(item.code).toBeGreaterThanOrEqual(0)
      expect(item.code).toBeLessThanOrEqual(255)
      expect(item.glyph).toHaveLength(8)
      expect(item.glyph.every((row) => row.length === 5)).toBe(true)
    }
  })

  it('includes preview glyphs for every special text character', () => {
    const fontMap = FONT as Record<string, unknown>

    for (const item of SPECIAL_TEXT_ITEMS) {
      expect(fontMap[item.display]).toBeDefined()
    }
  })

  it('keeps the custom emoji registry valid and grouped for the picker', () => {
    const displays = CUSTOM_EMOJI_ITEMS.map((item) => item.display)
    const specialDisplays = new Set(SPECIAL_TEXT_ITEMS.map((item) => item.display))
    const groupedItems = CUSTOM_EMOJI_GROUPS.flatMap((group) => group.items)

    expect(new Set(displays).size).toBe(displays.length)
    expect(displays.some((display) => specialDisplays.has(display))).toBe(false)
    expect(groupedItems).toEqual(CUSTOM_EMOJI_ITEMS)

    for (const item of CUSTOM_EMOJI_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.display).toHaveLength(1)
      expect(item.glyph).toHaveLength(8)
      expect(item.glyph.every((row) => row.length === 5)).toBe(true)
    }
  })

  it('includes preview glyphs for every custom emoji character', () => {
    const fontMap = FONT as Record<string, unknown>

    for (const item of CUSTOM_EMOJI_ITEMS) {
      expect(fontMap[item.display]).toBeDefined()
    }
  })
})
