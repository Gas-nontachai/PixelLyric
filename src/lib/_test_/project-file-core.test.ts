import { describe, expect, it } from 'vitest'

import {
  createProjectDocument,
  getProjectFileName,
  normalizeProjectName,
  parseProjectDocumentText,
  parseProjectNameFromFileName,
  projectDocumentToState,
  serializeProjectDocument,
} from '@/lib/project-file'
import type { PixelLyricProjectDocument, PixelLyricProjectState } from '@/types'

function createState(overrides: Partial<PixelLyricProjectState> = {}): PixelLyricProjectState {
  return {
    audioTrack: null,
    countdownSeconds: 0,
    includeCountdownInExport: false,
    pages: [
      {
        animation: 'replace',
        durationMs: 2000,
        durationUnit: 'ms',
        id: 'page-1',
        mode: 'page',
        rowTexts: ['', ''],
        text: 'Hello PixelLyric',
      },
    ],
    projectName: ' Demo Project ',
    screenType: '16x2',
    ...overrides,
  }
}

function createDocument(overrides: Partial<PixelLyricProjectDocument> = {}): PixelLyricProjectDocument {
  return {
    audioTrack: null,
    countdownSeconds: 0,
    includeCountdownInExport: false,
    format: 'pixelyric-project',
    pages: createState().pages,
    projectName: 'Demo Project',
    savedAt: '2026-04-19T00:00:00.000Z',
    screenType: '16x2',
    version: 1,
    ...overrides,
  }
}

describe('project-file core utilities', () => {
  it('normalizes project names and extracts them from file names', () => {
    expect(normalizeProjectName('  Demo  ')).toBe('Demo')
    expect(normalizeProjectName('   ')).toBe('Untitled')
    expect(normalizeProjectName(null)).toBe('Untitled')
    expect(parseProjectNameFromFileName(' demo project .pixelyric')).toBe('demo project')
  })

  it('sanitizes generated project file names', () => {
    expect(getProjectFileName(' Demo<>:"/\\|?* Project... ')).toBe('Demo Project.pixelyric')
    expect(getProjectFileName('   ', '.json')).toBe('Untitled.json')
  })

  it('creates and serializes project documents without audio tracks', async () => {
    const document = await createProjectDocument(createState())
    const serialized = serializeProjectDocument(document)

    expect(document.projectName).toBe('Demo Project')
    expect(document.audioTrack).toBeNull()
    expect(document.includeCountdownInExport).toBe(false)
    expect(document.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(serialized).toContain('\n  "projectName": "Demo Project"')
  })

  it('round-trips normalized documents back to state without audio', async () => {
    const state = await projectDocumentToState(createDocument({ projectName: '  Demo Project  ' }))

    expect(state.projectName).toBe('Demo Project')
    expect(state.audioTrack).toBeNull()
    expect(state.includeCountdownInExport).toBe(false)
    expect(state.pages).toHaveLength(1)
  })

  it('parses valid project text and restores defaults for empty page collections', () => {
    const document = parseProjectDocumentText(JSON.stringify(createDocument({
      countdownSeconds: 99 as never,
      pages: [],
      projectName: '   ',
      savedAt: 123 as never,
      screenType: '20x4',
    })))

    expect(document.projectName).toBe('Untitled')
    expect(document.countdownSeconds).toBe(0)
    expect(document.includeCountdownInExport).toBe(false)
    expect(document.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(document.pages).toHaveLength(2)
    expect(document.pages[0]).toMatchObject({
      text: 'hello',
      durationMs: 1000,
      durationUnit: 'ms',
      rowTexts: ['', '', '', ''],
    })
    expect(document.pages[1]).toMatchObject({
      text: 'Pixelyric',
      durationMs: 1000,
      durationUnit: 'ms',
      rowTexts: ['', '', '', ''],
    })
  })

  it('normalizes serialized pages and embedded audio payloads', () => {
    const document = parseProjectDocumentText(JSON.stringify(createDocument({
      audioTrack: {
        dataBase64: 'AQID',
        durationMs: 20,
        lastModified: 123.9,
        mimeType: '',
        name: 'Theme.mp3',
        trimEndMs: 999,
        trimStartMs: -10,
        volumePercent: 180,
      },
      pages: [
        {
          animation: 'typewriter',
          durationMs: 12.2,
          durationUnit: 'oops',
          id: '',
          mode: 'scroll',
          rowTexts: ['Alpha', 42],
          text: 'ABCDEFG',
        } as never,
      ],
    })))

    expect(document.pages[0]).toMatchObject({
      animation: 'scroll-left',
      durationMs: 100,
      durationUnit: 'ms',
      mode: 'scroll',
      rowTexts: ['Alpha', ''],
      text: 'ABCDEFG',
    })
    expect(document.pages[0].id).not.toBe('')
    expect(document.audioTrack).toEqual({
      dataBase64: 'AQID',
      durationMs: 100,
      lastModified: 124,
      mimeType: 'audio/mpeg',
      name: 'Theme.mp3',
      trimEndMs: 100,
      trimStartMs: 0,
      volumePercent: 100,
    })
  })

  it('throws clear errors for invalid project text payloads', () => {
    expect(() => parseProjectDocumentText('{')).toThrow('The project file could not be parsed')
    expect(() => parseProjectDocumentText(JSON.stringify({ format: 'other', version: 1, screenType: '16x2' }))).toThrow(
      'This file is not a PixelLyric project',
    )
    expect(() => parseProjectDocumentText(JSON.stringify({
      format: 'pixelyric-project',
      version: 2,
      screenType: '16x2',
    }))).toThrow('This project file version is not supported')
    expect(() => parseProjectDocumentText(JSON.stringify({
      format: 'pixelyric-project',
      version: 1,
      screenType: 'bad',
    }))).toThrow('The project file uses an unsupported screen type')
  })
})
