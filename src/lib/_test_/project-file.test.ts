import { describe, expect, it } from 'vitest'

import { serializeProjectInoContent } from '@/lib/project-file'
import type { PageScript, PixelLyricProjectDocument, ScreenPresetId } from '@/types'

function createPage(overrides: Partial<PageScript> = {}): PageScript {
  return {
    animation: 'replace',
    durationMs: 2000,
    durationUnit: 'ms',
    id: `page-${Math.random()}`,
    mode: 'page',
    rowTexts: ['', ''],
    text: 'Hello PixelLyric',
    ...overrides,
  }
}

function createDocument({
  countdownSeconds = 0,
  includeCountdownInExport = false,
  pages = [createPage()],
  projectName = 'Demo Sketch',
  screenType = '16x2',
}: {
  countdownSeconds?: PixelLyricProjectDocument['countdownSeconds']
  includeCountdownInExport?: PixelLyricProjectDocument['includeCountdownInExport']
  pages?: PageScript[]
  projectName?: string
  screenType?: ScreenPresetId
} = {}): PixelLyricProjectDocument {
  return {
    audioTrack: null,
    countdownSeconds,
    includeCountdownInExport,
    format: 'pixelyric-project',
    pages,
    projectName,
    savedAt: '2026-04-19T00:00:00.000Z',
    screenType,
    version: 1,
  }
}

describe('serializeProjectInoContent', () => {
  it('keeps blank 16x2 exports short and readable', () => {
    const content = serializeProjectInoContent(createDocument())

    expect(content).toContain('// User Config')
    expect(content).toContain('// Page Data')
    expect(content).toContain('// Runtime Helpers')
    expect(content).toContain('const uint8_t SCREEN_COLS = 16;')
    expect(content).toContain('const uint8_t SCREEN_ROWS = 2;')
    expect(content).toContain('const uint8_t PAGE_COUNT = 1;')
    expect(content).toContain('// Page 1: page, replace, 2000ms')
    expect(content).toContain('{ "Hello PixelLyric", "" }')
    expect(content).toContain('const unsigned long pageDurations[PAGE_COUNT] = {')
    expect(content).toContain('delay(pageDurations[pageIndex]);')
    expect(content).not.toContain('START_COUNTDOWN_SECONDS')
    expect(content).not.toContain('enum PageMode')
    expect(content).not.toContain('enum PageAnimation')
    expect(content).not.toContain('PageConfig')
    expect(content).not.toContain('renderPage(')
    expect(content).not.toContain('renderReplacePage')
    expect(content).not.toContain('renderTypewriterPage')
    expect(content).not.toContain('renderScrollPage')
    expect(content).not.toContain('runCountdown')
  })

  it('keeps static replace projects on the static-only path', () => {
    const content = serializeProjectInoContent(createDocument({
      pages: [
        createPage({ text: 'Page One' }),
        createPage({ text: 'Page Two', durationMs: 3500 }),
      ],
    }))

    expect(content).toContain('const unsigned long pageDurations[PAGE_COUNT] = {')
    expect(content).toContain('2000UL,')
    expect(content).toContain('3500UL')
    expect(content).toContain('lcd.print(fitRow(String(pageLines[pageIndex][rowIndex])));')
    expect(content).not.toContain('PageConfig')
    expect(content).not.toContain('enum PageMode')
    expect(content).not.toContain('enum PageAnimation')
    expect(content).not.toContain('ANIMATION_TYPEWRITER')
    expect(content).not.toContain('PAGE_MODE_SCROLL')
    expect(content).not.toContain('renderTypewriterPage')
    expect(content).not.toContain('renderScrollPage')
  })

  it('exports typewriter projects without scroll helpers', () => {
    const content = serializeProjectInoContent(createDocument({
      pages: [
        createPage({
          animation: 'typewriter',
          durationMs: 3200,
          rowTexts: ['', '', '', ''],
          text: 'Line 1\nLine 2',
        }),
      ],
    }))

    expect(content).toContain('ANIMATION_TYPEWRITER')
    expect(content).toContain('ANIMATION_SCROLL_LEFT = 2')
    expect(content).toContain('ANIMATION_SCROLL_RIGHT = 3')
    expect(content).toContain('renderTypewriterPage(pageIndex, durationMs);')
    expect(content).toContain('String repeatSpaces(uint8_t count)')
    expect(content).toContain('struct PageConfig')
    expect(content).toContain('const unsigned long pageStartMs = millis();')
    expect(content).toContain('uint16_t targetCharacters = (elapsedMs * totalCharacters) / durationMs;')
    expect(content).not.toContain('const unsigned long stepDelayMs = max(25UL, durationMs / totalCharacters);')
    expect(content).not.toContain('const unsigned long pageDurations[PAGE_COUNT]')
    expect(content).not.toContain('renderScrollPage')
    expect(content).not.toContain('buildScrollSource')
    expect(content).not.toContain('PAGE_MODE_SCROLL')
  })

  it('exports scroll projects without typewriter helpers', () => {
    const content = serializeProjectInoContent(createDocument({
      pages: [
        createPage({
          animation: 'scroll-right',
          durationMs: 4500,
          mode: 'scroll',
          rowTexts: ['Alpha', 'Beta'],
          text: '',
        }),
      ],
    }))

    expect(content).toContain('PAGE_MODE_SCROLL = 1')
    expect(content).toContain('ANIMATION_TYPEWRITER = 1')
    expect(content).toContain('ANIMATION_SCROLL_LEFT = 2')
    expect(content).toContain('ANIMATION_SCROLL_RIGHT = 3')
    expect(content).toContain('renderScrollPage(pageIndex, page.animation == ANIMATION_SCROLL_RIGHT, durationMs);')
    expect(content).toContain('String buildScrollSource(const String& rowText)')
    expect(content).toContain('struct PageConfig')
    expect(content).toContain('const unsigned long pageStartMs = millis();')
    expect(content).toContain('uint16_t targetStep = (elapsedMs * maxSteps) / durationMs;')
    expect(content).not.toContain('const unsigned long stepDelayMs = max(40UL, durationMs / maxSteps);')
    expect(content).not.toContain('for (uint16_t stepIndex = 0; stepIndex < maxSteps; stepIndex++) {\n    lcd.clear();')
    expect(content).not.toContain('const unsigned long pageDurations[PAGE_COUNT]')
    expect(content).not.toContain('renderTypewriterPage')
  })

  it('exports countdown and mixed animation helpers only when needed', () => {
    const content = serializeProjectInoContent(createDocument({
      countdownSeconds: 5,
      includeCountdownInExport: true,
      pages: [
        createPage({
          animation: 'typewriter',
          durationMs: 3200,
          rowTexts: ['', '', '', ''],
          text: 'Line 1\nLine 2\nLine 3\nLine 4',
        }),
        createPage({
          animation: 'scroll-left',
          durationMs: 4500,
          mode: 'scroll',
          rowTexts: ['Alpha', 'Beta', 'Gamma', 'Delta'],
          text: '',
        }),
      ],
      screenType: '20x4',
    }))

    expect(content).toContain('const uint8_t SCREEN_COLS = 20;')
    expect(content).toContain('const uint8_t SCREEN_ROWS = 4;')
    expect(content).toContain('const uint8_t START_COUNTDOWN_SECONDS = 5;')
    expect(content).toContain('ANIMATION_TYPEWRITER = 1')
    expect(content).toContain('ANIMATION_SCROLL_LEFT = 2')
    expect(content).toContain('ANIMATION_SCROLL_RIGHT = 3')
    expect(content).toContain('PAGE_MODE_SCROLL = 1')
    expect(content).toContain('renderScrollPage(pageIndex, animation == ANIMATION_SCROLL_RIGHT, durationMs);')
    expect(content).toContain('renderTypewriterPage(pageIndex, durationMs);')
    expect(content).toContain('void runCountdown()')
    expect(content).toContain('for (int seconds = START_COUNTDOWN_SECONDS; seconds > 0; seconds--) {')
    expect(content).toContain('lcd.print("Starting in");')
    expect(content).toContain('lcd.print(seconds);')
    expect(content).toContain('runCountdown();')
    expect(content).toContain('struct PageConfig')
    expect(content).toContain('renderStaticPage(pageIndex);')
    expect(content).toContain('const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);')
    expect(content).not.toContain('const unsigned long pageDurations[PAGE_COUNT]')
    expect(content).not.toContain('max(25UL')
    expect(content).not.toContain('max(40UL')
  })

  it('skips countdown Arduino code when export toggle is off', () => {
    const content = serializeProjectInoContent(createDocument({
      countdownSeconds: 5,
    }))

    expect(content).not.toContain('const uint8_t START_COUNTDOWN_SECONDS')
    expect(content).not.toContain('void runCountdown()')
    expect(content).not.toContain('runCountdown();')
  })

  it('preserves string escaping in ultra-simple static exports', () => {
    const content = serializeProjectInoContent(createDocument({
      pages: [
        createPage({
          durationMs: 2800,
          rowTexts: ['', ''],
          text: 'Say "Hi"\nPath \\ Demo',
        }),
      ],
      projectName: 'Sketch "A" \\ Demo',
    }))

    expect(content).toContain('// Project: Sketch \\"A\\" \\\\ Demo')
    expect(content).toContain('{ "Say \\"Hi\\"", "Path \\\\ Demo" }')
    expect(content).toContain('const unsigned long pageDurations[PAGE_COUNT]')
  })
})
