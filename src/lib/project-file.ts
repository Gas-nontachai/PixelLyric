import {
  createInitialPage,
  getPresetById,
  normalizePageText,
  normalizeRowTexts,
} from '@/lib/lcd'
import type {
  CountdownOption,
  DurationUnit,
  LcdAnimation,
  PageMode,
  PageScript,
  PixelLyricProjectDocument,
  PixelLyricProjectState,
  ProjectAudioTrack,
  ScreenPresetId,
  SerializedProjectAudioTrack,
} from '@/types'

const PROJECT_FILE_FORMAT = 'pixelyric-project'
const PROJECT_FILE_EXTENSION = '.pixelyric'
const PROJECT_FILE_MIME = 'application/vnd.pixelyric.project+json'
const PROJECT_JSON_EXTENSION = '.json'
const PROJECT_VERSION = 1
const MIN_TRIM_GAP_MS = 100
const COUNTDOWN_OPTIONS: CountdownOption[] = [0, 3, 5, 10]
const FALLBACK_PROJECT_NAME = 'Untitled'

const serializedAudioCache = new WeakMap<File, Promise<SerializedProjectAudioTrack>>()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPageMode(value: unknown): value is PageMode {
  return value === 'page' || value === 'scroll'
}

function isDurationUnit(value: unknown): value is DurationUnit {
  return value === 'ms' || value === 's'
}

function isLcdAnimation(value: unknown): value is LcdAnimation {
  return value === 'replace' || value === 'typewriter' || value === 'scroll-left' || value === 'scroll-right'
}

function isScreenPresetId(value: unknown): value is ScreenPresetId {
  return value === '16x2' || value === '20x4'
}

function isCountdownOption(value: unknown): value is CountdownOption {
  return typeof value === 'number' && COUNTDOWN_OPTIONS.includes(value as CountdownOption)
}

export function normalizeProjectName(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''

  return normalizedValue || FALLBACK_PROJECT_NAME
}

export function parseProjectNameFromFileName(fileName: string) {
  const strippedExtension = fileName.replace(/\.[^.]+$/, '')
  return normalizeProjectName(strippedExtension)
}

function sanitizeProjectFileBaseName(projectName: string) {
  const sanitizedName = Array.from(normalizeProjectName(projectName))
    .filter((character) => character >= ' ')
    .join('')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/g, '')

  return sanitizedName || FALLBACK_PROJECT_NAME
}

function normalizePageAnimation(mode: PageMode, animation: unknown): LcdAnimation {
  if (!isLcdAnimation(animation)) {
    return mode === 'scroll' ? 'scroll-left' : 'replace'
  }

  if (mode === 'scroll') {
    return animation === 'scroll-left' || animation === 'scroll-right' ? animation : 'scroll-left'
  }

  return animation === 'replace' || animation === 'typewriter' ? animation : 'replace'
}

function normalizeSerializedPage(
  page: unknown,
  columns: number,
  rows: number,
): PageScript {
  if (!isObject(page)) {
    return createInitialPage(rows)
  }

  const mode = isPageMode(page.mode) ? page.mode : 'page'
  const durationMs = typeof page.durationMs === 'number' && Number.isFinite(page.durationMs)
    ? Math.max(100, Math.round(page.durationMs))
    : 2000
  const durationUnit = isDurationUnit(page.durationUnit) ? page.durationUnit : 'ms'
  const text = typeof page.text === 'string' ? normalizePageText(page.text, columns, rows) : ''
  const rowTexts = Array.isArray(page.rowTexts)
    ? normalizeRowTexts(
        page.rowTexts.map((value) => (typeof value === 'string' ? value : '')),
        rows,
      )
    : normalizeRowTexts([], rows)

  return {
    id: typeof page.id === 'string' && page.id ? page.id : crypto.randomUUID(),
    mode,
    animation: normalizePageAnimation(mode, page.animation),
    durationMs,
    durationUnit,
    text,
    rowTexts,
  }
}

function clampTrimRange(durationMs: number, trimStartMs: number, trimEndMs: number) {
  const boundedStartMs = Math.min(Math.max(0, Math.round(trimStartMs)), Math.max(0, durationMs - MIN_TRIM_GAP_MS))
  const boundedEndMs = Math.max(
    Math.min(Math.round(trimEndMs), durationMs),
    boundedStartMs + MIN_TRIM_GAP_MS,
  )

  return {
    trimStartMs: boundedStartMs,
    trimEndMs: Math.min(boundedEndMs, durationMs),
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the audio file'))
        return
      }

      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error('Could not read the audio file'))
    }

    reader.readAsDataURL(file)
  })
}

function base64ToUint8Array(value: string) {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    throw new Error('Embedded audio data is empty')
  }

  const binaryValue = atob(normalizedValue)
  const bytes = new Uint8Array(binaryValue.length)

  for (let index = 0; index < binaryValue.length; index += 1) {
    bytes[index] = binaryValue.charCodeAt(index)
  }

  return bytes
}

async function serializeAudioTrack(track: ProjectAudioTrack): Promise<SerializedProjectAudioTrack> {
  const cachedTrack = serializedAudioCache.get(track.sourceFile)

  if (cachedTrack) {
    const serializedTrack = await cachedTrack

    return {
      ...serializedTrack,
      durationMs: track.durationMs,
      trimStartMs: track.trimStartMs,
      trimEndMs: track.trimEndMs,
      name: track.name,
    }
  }

  const nextSerializedTrackPromise = readFileAsDataUrl(track.sourceFile).then((dataUrl) => {
    const [, mimeType = track.sourceFile.type || 'audio/mpeg', dataBase64 = ''] = /^data:(.*?);base64,(.*)$/.exec(dataUrl) ?? []

    if (!dataBase64) {
      throw new Error('Could not embed the MP3 into the project file')
    }

    return {
      name: track.name,
      mimeType,
      lastModified: track.sourceFile.lastModified,
      durationMs: track.durationMs,
      trimStartMs: track.trimStartMs,
      trimEndMs: track.trimEndMs,
      dataBase64,
    }
  })

  serializedAudioCache.set(track.sourceFile, nextSerializedTrackPromise)

  return nextSerializedTrackPromise
}

function normalizeProjectDocument(value: unknown): PixelLyricProjectDocument {
  if (!isObject(value)) {
    throw new Error('The project file is not valid JSON')
  }

  if (value.format !== PROJECT_FILE_FORMAT) {
    throw new Error('This file is not a PixelLyric project')
  }

  if (value.version !== PROJECT_VERSION) {
    throw new Error('This project file version is not supported')
  }

  if (!isScreenPresetId(value.screenType)) {
    throw new Error('The project file uses an unsupported screen type')
  }

  const preset = getPresetById(value.screenType)
  const countdownSeconds = isCountdownOption(value.countdownSeconds) ? value.countdownSeconds : 0
  const rawPages = Array.isArray(value.pages) ? value.pages : []
  const pages = rawPages.length > 0
    ? rawPages.map((page) => normalizeSerializedPage(page, preset.columns, preset.rows))
    : [createInitialPage(preset.rows)]

  let audioTrack: SerializedProjectAudioTrack | null = null

  if (value.audioTrack !== null && value.audioTrack !== undefined) {
    if (!isObject(value.audioTrack)) {
      throw new Error('The embedded audio payload is not valid')
    }

    const embeddedTrack = value.audioTrack

    if (
      typeof embeddedTrack.name !== 'string' ||
      typeof embeddedTrack.mimeType !== 'string' ||
      typeof embeddedTrack.lastModified !== 'number' ||
      typeof embeddedTrack.durationMs !== 'number' ||
      typeof embeddedTrack.trimStartMs !== 'number' ||
      typeof embeddedTrack.trimEndMs !== 'number' ||
      typeof embeddedTrack.dataBase64 !== 'string'
    ) {
      throw new Error('The embedded audio payload is incomplete')
    }

    const durationMs = Math.max(MIN_TRIM_GAP_MS, Math.round(embeddedTrack.durationMs))
    const trimRange = clampTrimRange(durationMs, embeddedTrack.trimStartMs, embeddedTrack.trimEndMs)

    audioTrack = {
      name: embeddedTrack.name,
      mimeType: embeddedTrack.mimeType || 'audio/mpeg',
      lastModified: Math.round(embeddedTrack.lastModified),
      durationMs,
      trimStartMs: trimRange.trimStartMs,
      trimEndMs: trimRange.trimEndMs,
      dataBase64: embeddedTrack.dataBase64,
    }
  }

  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_VERSION,
    projectName: typeof value.projectName === 'string' ? normalizeProjectName(value.projectName) : FALLBACK_PROJECT_NAME,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date().toISOString(),
    screenType: value.screenType,
    countdownSeconds,
    pages,
    audioTrack,
  }
}

export async function createProjectDocument(state: PixelLyricProjectState): Promise<PixelLyricProjectDocument> {
  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_VERSION,
    projectName: normalizeProjectName(state.projectName),
    savedAt: new Date().toISOString(),
    screenType: state.screenType,
    countdownSeconds: state.countdownSeconds,
    pages: state.pages,
    audioTrack: state.audioTrack ? await serializeAudioTrack(state.audioTrack) : null,
  }
}

export async function projectDocumentToState(
  document: PixelLyricProjectDocument,
): Promise<PixelLyricProjectState> {
  const normalizedDocument = normalizeProjectDocument(document)
  let audioTrack: ProjectAudioTrack | null = null

  if (normalizedDocument.audioTrack) {
    const bytes = base64ToUint8Array(normalizedDocument.audioTrack.dataBase64)
    const sourceFile = new File([bytes], normalizedDocument.audioTrack.name, {
      type: normalizedDocument.audioTrack.mimeType,
      lastModified: normalizedDocument.audioTrack.lastModified,
    })

    audioTrack = {
      name: normalizedDocument.audioTrack.name,
      sourceFile,
      objectUrl: URL.createObjectURL(sourceFile),
      durationMs: normalizedDocument.audioTrack.durationMs,
      trimStartMs: normalizedDocument.audioTrack.trimStartMs,
      trimEndMs: normalizedDocument.audioTrack.trimEndMs,
    }
  }

  return {
    projectName: normalizedDocument.projectName,
    screenType: normalizedDocument.screenType,
    countdownSeconds: normalizedDocument.countdownSeconds,
    pages: normalizedDocument.pages,
    audioTrack,
  }
}

export function parseProjectDocumentText(text: string) {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(text)
  } catch {
    throw new Error('The project file could not be parsed')
  }

  return normalizeProjectDocument(parsedValue)
}

export function serializeProjectDocument(document: PixelLyricProjectDocument) {
  return JSON.stringify(document, null, 2)
}

export function downloadProjectDocument(document: PixelLyricProjectDocument, fileName?: string) {
  const content = serializeProjectDocument(document)
  const nextFileName = fileName ?? getProjectFileName(document.projectName)
  downloadTextFile(content, nextFileName, PROJECT_FILE_MIME)
}

export function downloadProjectJson(document: PixelLyricProjectDocument, fileName?: string) {
  const content = serializeProjectDocument(document)
  const nextFileName = fileName ?? getProjectFileName(document.projectName, PROJECT_JSON_EXTENSION)
  downloadTextFile(content, nextFileName, 'application/json')
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = documentRef.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName
  anchor.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 0)
}

export function getProjectFileName(projectName: string, extension = PROJECT_FILE_EXTENSION) {
  return `${sanitizeProjectFileBaseName(projectName)}${extension}`
}

const documentRef = document
