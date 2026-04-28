import {
  createDefaultPages,
  createInitialPage,
  getPresetById,
  normalizePageText,
  normalizeRowTexts,
  textToDisplayRows,
} from '@/lib/lcd'
import { isAudioDurationWithinLimit } from '@/lib/audio'
import { getCustomEmojiItem, hasCustomEmoji, type CustomEmojiItem } from '@/configs/custom-emoji'
import { getSpecialTextCode, getSpecialTextItem, hasSpecialText, type SpecialTextItem } from '@/configs/special-text'
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
const PROJECT_INO_EXTENSION = '.ino'
const PROJECT_VERSION = 1
const MIN_TRIM_GAP_MS = 100
const COUNTDOWN_OPTIONS: CountdownOption[] = [0, 3, 5, 10]
const FALLBACK_PROJECT_NAME = 'Untitled'
const DEFAULT_AUDIO_VOLUME_PERCENT = 100

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

function normalizeEmbeddedAudioDurationMs(durationMs: number) {
  const normalizedDurationMs = Math.max(MIN_TRIM_GAP_MS, Math.round(durationMs))

  if (!isAudioDurationWithinLimit(normalizedDurationMs)) {
    throw new Error('Embedded MP3 must be 5:00 or shorter')
  }

  return normalizedDurationMs
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
      volumePercent: track.volumePercent,
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
      volumePercent: track.volumePercent,
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
  const includeCountdownInExport = value.includeCountdownInExport === true
  const rawPages = Array.isArray(value.pages) ? value.pages : []
  const pages = rawPages.length > 0
    ? rawPages.map((page) => normalizeSerializedPage(page, preset.columns, preset.rows))
    : createDefaultPages(preset.rows)

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

    const durationMs = normalizeEmbeddedAudioDurationMs(embeddedTrack.durationMs)
    const trimRange = clampTrimRange(durationMs, embeddedTrack.trimStartMs, embeddedTrack.trimEndMs)

    audioTrack = {
      name: embeddedTrack.name,
      mimeType: embeddedTrack.mimeType || 'audio/mpeg',
      lastModified: Math.round(embeddedTrack.lastModified),
      durationMs,
      trimStartMs: trimRange.trimStartMs,
      trimEndMs: trimRange.trimEndMs,
      volumePercent:
        typeof embeddedTrack.volumePercent === 'number' && Number.isFinite(embeddedTrack.volumePercent)
          ? Math.min(100, Math.max(0, Math.round(embeddedTrack.volumePercent)))
          : DEFAULT_AUDIO_VOLUME_PERCENT,
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
    includeCountdownInExport,
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
    includeCountdownInExport: state.includeCountdownInExport,
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
      volumePercent: normalizedDocument.audioTrack.volumePercent,
    }
  }

  return {
    projectName: normalizedDocument.projectName,
    screenType: normalizedDocument.screenType,
    countdownSeconds: normalizedDocument.countdownSeconds,
    includeCountdownInExport: normalizedDocument.includeCountdownInExport,
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

function trimTrailingWhitespace(value: string) {
  return value.replace(/\s+$/g, '')
}

function escapeArduinoString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ')
}

type ArduinoExportPage = {
  animation: LcdAnimation
  comment: string
  durationMs: number
  mode: PageMode
  rows: string[]
}

type ArduinoSpecialExportPage = ArduinoExportPage & {
  customGlyphs: ArduinoCustomGlyph[]
  rowBytes: number[][]
}

type ArduinoCustomGlyph = {
  id: string
  label: string
  display: string
  glyph: number[][]
  slot: number
}

type ArduinoExportModel = {
  countdownSeconds: CountdownOption
  includeCountdownInExport: boolean
  pageCount: number
  pages: ArduinoSpecialExportPage[]
  projectName: string
  screenType: ScreenPresetId
  screenColumns: number
  screenRows: number
  usedAnimations: LcdAnimation[]
  usedModes: PageMode[]
  usesCountdown: boolean
  usesCustomEmoji: boolean
  usesOnlyStaticReplace: boolean
  usesScroll: boolean
  usesSpecialText: boolean
  usesTypewriter: boolean
  usesUltraSimpleStaticTemplate: boolean
  usedSpecialTextItems: SpecialTextItem[]
  usedCustomEmojiItems: CustomEmojiItem[]
  customSpecialTextItems: SpecialTextItem[]
  customGlyphs: ArduinoCustomGlyph[]
  maxLineBytes: number
}

function getProjectExportRows(
  screenType: ScreenPresetId,
  page: PageScript,
) {
  const preset = getPresetById(screenType)

  if (page.mode === 'scroll') {
    return normalizeRowTexts(page.rowTexts, preset.rows).map((rowText) =>
      trimTrailingWhitespace(rowText.slice(0, preset.columns)),
    )
  }

  const normalizedText = normalizePageText(page.text, preset.columns, preset.rows)

  return textToDisplayRows(normalizedText, preset.columns, preset.rows).map(trimTrailingWhitespace)
}

function getProjectInoRows(screenType: ScreenPresetId, page: PageScript) {
  const preset = getPresetById(screenType)

  if (page.mode === 'scroll') {
    return normalizeRowTexts(page.rowTexts, preset.rows).map((rowText) => rowText.replace(/\r/g, ''))
  }

  return getProjectExportRows(screenType, page)
}

function getArduinoByteValue(character: string, customEmojiSlots: Map<string, number>) {
  const customEmojiItem = getCustomEmojiItem(character)

  if (customEmojiItem) {
    return customEmojiSlots.get(customEmojiItem.display) ?? 32
  }

  return getSpecialTextCode(character) ?? character.charCodeAt(0)
}

function getArduinoRowBytes(rowText: string, customEmojiSlots: Map<string, number>) {
  return Array.from(rowText.replace(/\r/g, '').replace(/\n/g, ' ')).map((character) =>
    getArduinoByteValue(character, customEmojiSlots),
  )
}

function formatArduinoByteArray(bytes: number[], width: number) {
  const paddedBytes = bytes.slice(0, width)

  while (paddedBytes.length < width) {
    paddedBytes.push(32)
  }

  return `{ ${paddedBytes.map((byte) => `${byte}`).join(', ')} }`
}

function getUsedSpecialTextItems(rows: string[]) {
  const usedItems = new Map<string, SpecialTextItem>()

  for (const row of rows) {
    for (const character of Array.from(row)) {
      const item = getSpecialTextItem(character)

      if (item) {
        usedItems.set(item.display, item)
      }
    }
  }

  return Array.from(usedItems.values())
}

function getUsedCustomEmojiItems(rows: string[]) {
  const usedItems = new Map<string, CustomEmojiItem>()

  for (const row of rows) {
    for (const character of Array.from(row)) {
      const item = getCustomEmojiItem(character)

      if (item) {
        usedItems.set(item.display, item)
      }
    }
  }

  return Array.from(usedItems.values())
}

function getCustomSpecialTextItems(items: SpecialTextItem[]) {
  const customItems = new Map<number, SpecialTextItem>()

  for (const item of items) {
    if (item.code >= 0 && item.code <= 7 && !customItems.has(item.code)) {
      customItems.set(item.code, item)
    }
  }

  return Array.from(customItems.values())
}

function buildPageCustomGlyphs(rows: string[]) {
  const customGlyphs: ArduinoCustomGlyph[] = []
  const usedSlots = new Set<number>()

  for (const item of getCustomSpecialTextItems(getUsedSpecialTextItems(rows))) {
    customGlyphs.push({
      id: item.id,
      label: item.label,
      display: item.display,
      glyph: item.glyph,
      slot: item.code,
    })
    usedSlots.add(item.code)
  }

  const availableSlots = Array.from({ length: 8 }, (_, slot) => slot).filter((slot) => !usedSlots.has(slot))

  for (const item of getUsedCustomEmojiItems(rows)) {
    const slot = availableSlots.shift()

    if (slot === undefined) {
      break
    }

    customGlyphs.push({
      id: item.id,
      label: item.label,
      display: item.display,
      glyph: item.glyph,
      slot,
    })
  }

  return customGlyphs
}

function getCustomEmojiSlots(customGlyphs: ArduinoCustomGlyph[]) {
  return new Map(
    customGlyphs.map((glyph) => [glyph.display, glyph.slot]),
  )
}

function getInoPageModeValue(mode: PageMode) {
  return mode === 'scroll' ? 'PAGE_MODE_SCROLL' : 'PAGE_MODE_STATIC'
}

function getInoAnimationValue(animation: LcdAnimation) {
  switch (animation) {
    case 'typewriter':
      return 'ANIMATION_TYPEWRITER'
    case 'scroll-left':
      return 'ANIMATION_SCROLL_LEFT'
    case 'scroll-right':
      return 'ANIMATION_SCROLL_RIGHT'
    default:
      return 'ANIMATION_REPLACE'
  }
}

function formatPageComment(page: PageScript, pageIndex: number) {
  return `Page ${pageIndex + 1}: ${page.mode}, ${page.animation}, ${Math.max(100, Math.round(page.durationMs))}ms`
}

function buildArduinoExportModel(document: PixelLyricProjectDocument): ArduinoExportModel {
  const preset = getPresetById(document.screenType)
  const usedModes = Array.from(new Set(document.pages.map((page) => page.mode)))
  const usedAnimations = Array.from(new Set(document.pages.map((page) => page.animation)))
  const usesScroll = usedModes.includes('scroll')
  const usesTypewriter = usedAnimations.includes('typewriter')
  const usesCountdown = document.countdownSeconds > 0 && document.includeCountdownInExport
  const pages = document.pages.map((page, pageIndex) => {
    const rows = getProjectInoRows(document.screenType, page)
    const customGlyphs = buildPageCustomGlyphs(rows)
    const customEmojiSlots = getCustomEmojiSlots(customGlyphs)

    return {
      animation: page.animation,
      comment: formatPageComment(page, pageIndex),
      durationMs: Math.max(100, Math.round(page.durationMs)),
      mode: page.mode,
      customGlyphs,
      rows,
      rowBytes: rows.map((row) => getArduinoRowBytes(row, customEmojiSlots)),
    }
  })
  const usesSpecialText = pages.some((page) => page.rows.some((row) => hasSpecialText(row) || hasCustomEmoji(row)))
  const usesCustomEmoji = pages.some((page) => page.rows.some(hasCustomEmoji))
  const usedSpecialTextItems = getUsedSpecialTextItems(pages.flatMap((page) => page.rows))
  const usedCustomEmojiItems = getUsedCustomEmojiItems(pages.flatMap((page) => page.rows))
  const customSpecialTextItems = getCustomSpecialTextItems(usedSpecialTextItems)
  const customGlyphs = Array.from(
    new Map(pages.flatMap((page) => page.customGlyphs).map((glyph) => [glyph.id, glyph])).values(),
  )
  const maxLineBytes = Math.max(
    preset.columns,
    ...pages.flatMap((page) => page.rowBytes.map((rowBytes) => rowBytes.length)),
  )
  const usesOnlyStaticReplace = !usesScroll && !usesTypewriter && usedAnimations.every((animation) => animation === 'replace')
  const usesUltraSimpleStaticTemplate = usesOnlyStaticReplace && !usesCountdown && !usesSpecialText

  return {
    countdownSeconds: document.countdownSeconds,
    includeCountdownInExport: document.includeCountdownInExport,
    pageCount: document.pages.length,
    pages,
    projectName: escapeArduinoString(document.projectName),
    screenColumns: preset.columns,
    screenRows: preset.rows,
    screenType: document.screenType,
    usedAnimations,
    usedModes,
    usesCountdown,
    usesCustomEmoji,
    usesOnlyStaticReplace,
    usesScroll,
    usesSpecialText,
    usesTypewriter,
    usesUltraSimpleStaticTemplate,
    usedSpecialTextItems,
    usedCustomEmojiItems,
    customSpecialTextItems,
    customGlyphs,
    maxLineBytes,
  }
}

function renderArduinoSectionComment(title: string, description?: string) {
  return description
    ? `// ${title}\n// ${description}`
    : `// ${title}`
}

function renderArduinoPageRows(page: ArduinoExportPage) {
  const rows = page.rows
    .map((rowText) => `"${escapeArduinoString(rowText)}"`)
    .join(', ')

  return `  { ${rows} }`
}

function renderArduinoPageConfig(page: ArduinoExportPage, pageIndex: number) {
  return `  // ${page.comment}
  {
    ${getInoPageModeValue(page.mode)},
    ${getInoAnimationValue(page.animation)},
    ${page.durationMs}UL,
    pageLines[${pageIndex}]
  }`
}

function renderArduinoPageData(model: ArduinoExportModel) {
  const pageLines = model.pages
    .map((page, pageIndex) => `  // ${page.comment}\n${renderArduinoPageRows(page)}${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')

  const pageConfigs = model.pages
    .map((page, pageIndex) => `${renderArduinoPageConfig(page, pageIndex)}${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')

  return `${renderArduinoSectionComment('Page Data', 'Edit the text rows or timings below to customize the sketch.')}\nconst char* pageLines[PAGE_COUNT][SCREEN_ROWS] = {\n${pageLines}\n};\n\nconst PageConfig pages[PAGE_COUNT] = {\n${pageConfigs}\n};`
}

function renderUltraSimpleStaticPageData(model: ArduinoExportModel) {
  const pageLines = model.pages
    .map((page, pageIndex) => `  // ${page.comment}\n${renderArduinoPageRows(page)}${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')

  const pageDurations = model.pages
    .map((page, pageIndex) => `  // ${page.comment}\n  ${page.durationMs}UL${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')

  return `${renderArduinoSectionComment('Page Data', 'Edit the text rows or timings below to customize the sketch.')}\nconst char* pageLines[PAGE_COUNT][SCREEN_ROWS] = {\n${pageLines}\n};\n\nconst unsigned long pageDurations[PAGE_COUNT] = {\n${pageDurations}\n};`
}

function renderSpecialArduinoPageRows(page: ArduinoSpecialExportPage, width: number) {
  const rows = page.rowBytes
    .map((rowBytes) => `    ${formatArduinoByteArray(rowBytes, width)}`)
    .join(',\n')

  return `  {\n${rows}\n  }`
}

function renderSpecialArduinoPageLengths(page: ArduinoSpecialExportPage) {
  return `  { ${page.rowBytes.map((rowBytes) => rowBytes.length).join(', ')} }`
}

function renderSpecialArduinoPageConfig(page: ArduinoSpecialExportPage) {
  return `  // ${page.comment}
  {
    ${getInoPageModeValue(page.mode)},
    ${getInoAnimationValue(page.animation)},
    ${page.durationMs}UL
  }`
}

function renderSpecialArduinoPageData(model: ArduinoExportModel) {
  const pageLineLengths = model.pages
    .map((page, pageIndex) => `  // ${page.comment}\n${renderSpecialArduinoPageLengths(page)}${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')
  const pageLines = model.pages
    .map((page, pageIndex) => `  // ${page.comment}\n${renderSpecialArduinoPageRows(page, model.maxLineBytes)}${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')
  const pageConfigs = model.pages
    .map((page, pageIndex) => `${renderSpecialArduinoPageConfig(page)}${pageIndex < model.pages.length - 1 ? ',' : ''}`)
    .join('\n')

  return `${renderArduinoSectionComment('Page Data', 'Special text is stored as LCD byte codes so Unicode symbols do not break the sketch.')}
const uint16_t MAX_LINE_BYTES = ${model.maxLineBytes};

const uint16_t pageLineLengths[PAGE_COUNT][SCREEN_ROWS] = {
${pageLineLengths}
};

const uint8_t pageLines[PAGE_COUNT][SCREEN_ROWS][MAX_LINE_BYTES] = {
${pageLines}
};

const PageConfig pages[PAGE_COUNT] = {
${pageConfigs}
};`
}

function getArduinoIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function formatArduinoGlyphRow(row: number[]) {
  return `B${row.map((value) => (value ? '1' : '0')).join('')}`
}

function renderSpecialCharacterDefinitions(model: ArduinoExportModel) {
  const specialCharacterMap = model.usedSpecialTextItems
    .map((item) => {
      const kind = item.code >= 0 && item.code <= 7 ? 'custom glyph loaded below' : 'LCD ROM byte'
      return `// ${item.display} (${item.label}) -> lcd.write((uint8_t)${item.code}); ${kind}`
    })
    .join('\n')
  const customEmojiMap = model.usedCustomEmojiItems
    .map((item) => `// ${item.display} (${item.label}) -> page-local lcd.createChar slot`)
    .join('\n')
  const characterMap = [specialCharacterMap, customEmojiMap].filter(Boolean).join('\n')

  const customGlyphs = model.customGlyphs
    .map((glyph) => {
      const constantName = `CUSTOM_GLYPH_${getArduinoIdentifier(glyph.id).toUpperCase()}`
      const rows = glyph.glyph.map((row) => `  ${formatArduinoGlyphRow(row)}`).join(',\n')

      return `byte ${constantName}[8] = {
${rows}
};`
    })
    .join('\n\n')

  const createCharCases = model.pages
    .map((page, pageIndex) => {
      const createCharLines = page.customGlyphs
        .map((glyph) => `      lcd.createChar(${glyph.slot}, CUSTOM_GLYPH_${getArduinoIdentifier(glyph.id).toUpperCase()});`)
        .join('\n')

      return `    case ${pageIndex}:
${createCharLines || '      // This page does not use custom CGRAM glyphs.'}
      break;`
    })
    .join('\n')

  return `${renderArduinoSectionComment('Special Text Hardware Map', 'CGRAM custom slots are reloaded per page; ROM bytes depend on your LCD controller character set.')}
${characterMap}
${customGlyphs ? `\n${customGlyphs}\n` : ''}
void loadPageCustomCharacters(uint8_t pageIndex) {
  switch (pageIndex) {
${createCharCases}
    default:
      break;
  }
}`
}

function renderPageModeEnum(model: ArduinoExportModel) {
  const pageModes = ['  PAGE_MODE_STATIC = 0']

  if (model.usesScroll) {
    pageModes.push('  PAGE_MODE_SCROLL = 1')
  }

  return `enum PageMode {\n${pageModes.join(',\n')}\n};`
}

function renderPageAnimationEnum() {
  return `enum PageAnimation {
  ANIMATION_REPLACE = 0,
  ANIMATION_TYPEWRITER = 1,
  ANIMATION_SCROLL_LEFT = 2,
  ANIMATION_SCROLL_RIGHT = 3
};`
}

function renderRepeatSpacesHelper() {
  return `String repeatSpaces(uint8_t count) {
  String output = "";

  for (uint8_t index = 0; index < count; index++) {
    output += " ";
  }

  return output;
}`
}

function renderFitRowHelper() {
  return `String fitRow(String value) {
  value.replace("\\r", "");
  value.replace("\\n", " ");

  if (value.length() > SCREEN_COLS) {
    value = value.substring(0, SCREEN_COLS);
  }

  while (value.length() < SCREEN_COLS) {
    value += " ";
  }

  return value;
}`
}

function renderPrintPageRowsHelper() {
  return `void printPageRows(String rows[SCREEN_ROWS]) {
  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    lcd.setCursor(0, rowIndex);
    lcd.print(rows[rowIndex]);
  }
}`
}

function renderSpecialPageByteHelpers() {
  return `uint8_t getPageLineByte(uint8_t pageIndex, uint8_t rowIndex, uint16_t byteIndex) {
  if (byteIndex < pageLineLengths[pageIndex][rowIndex]) {
    return pageLines[pageIndex][rowIndex][byteIndex];
  }

  return ' ';
}

void writePageLineWindow(uint8_t pageIndex, uint8_t rowIndex, uint16_t windowStart) {
  for (uint8_t columnIndex = 0; columnIndex < SCREEN_COLS; columnIndex++) {
    lcd.write((uint8_t)getPageLineByte(pageIndex, rowIndex, windowStart + columnIndex));
  }
}`
}

function renderSpecialStaticPageHelper() {
  return `void renderStaticPage(uint8_t pageIndex) {
  lcd.clear();

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    lcd.setCursor(0, rowIndex);
    writePageLineWindow(pageIndex, rowIndex, 0);
  }
}`
}

function renderSpecialTypewriterPageHelper() {
  return `void renderTypewriterPage(uint8_t pageIndex, unsigned long durationMs) {
  const uint16_t totalCharacters = SCREEN_COLS * SCREEN_ROWS;

  lcd.clear();
  const unsigned long pageStartMs = millis();
  uint16_t renderedCharacters = 0;

  if (durationMs < totalCharacters) {
    renderStaticPage(pageIndex);
    const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);

    if (remainingMs > 0) {
      delay(remainingMs);
    }

    return;
  }

  while (renderedCharacters < totalCharacters) {
    const unsigned long elapsedMs = millis() - pageStartMs;

    if (elapsedMs >= durationMs) {
      break;
    }

    uint16_t targetCharacters = (elapsedMs * totalCharacters) / durationMs;

    if (targetCharacters > totalCharacters) {
      targetCharacters = totalCharacters;
    }

    if (targetCharacters == renderedCharacters) {
      delay(1);
      continue;
    }

    while (renderedCharacters < targetCharacters) {
      const uint8_t rowIndex = renderedCharacters / SCREEN_COLS;
      const uint8_t columnIndex = renderedCharacters % SCREEN_COLS;
      lcd.setCursor(columnIndex, rowIndex);
      lcd.write((uint8_t)getPageLineByte(pageIndex, rowIndex, columnIndex));
      renderedCharacters++;
    }
  }

  while (renderedCharacters < totalCharacters) {
    const uint8_t rowIndex = renderedCharacters / SCREEN_COLS;
    const uint8_t columnIndex = renderedCharacters % SCREEN_COLS;
    lcd.setCursor(columnIndex, rowIndex);
    lcd.write((uint8_t)getPageLineByte(pageIndex, rowIndex, columnIndex));
    renderedCharacters++;
  }

  const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);

  if (remainingMs > 0) {
    delay(remainingMs);
  }
}`
}

function renderSpecialScrollPageHelper() {
  return `uint8_t getScrollSourceByte(uint8_t pageIndex, uint8_t rowIndex, uint16_t sourceIndex) {
  if (sourceIndex < SCREEN_COLS) {
    return ' ';
  }

  const uint16_t lineIndex = sourceIndex - SCREEN_COLS;

  if (lineIndex < pageLineLengths[pageIndex][rowIndex]) {
    return pageLines[pageIndex][rowIndex][lineIndex];
  }

  return ' ';
}

void writeScrollWindow(uint8_t pageIndex, uint8_t rowIndex, uint16_t windowStart) {
  for (uint8_t columnIndex = 0; columnIndex < SCREEN_COLS; columnIndex++) {
    lcd.write((uint8_t)getScrollSourceByte(pageIndex, rowIndex, windowStart + columnIndex));
  }
}

void renderScrollPage(uint8_t pageIndex, bool scrollRight, unsigned long durationMs) {
  uint16_t maxSteps = 1;

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    const uint16_t sourceLength = SCREEN_COLS + pageLineLengths[pageIndex][rowIndex] + SCREEN_COLS;
    const uint16_t rowSteps = sourceLength >= SCREEN_COLS ? sourceLength - SCREEN_COLS + 1 : 1;
    maxSteps = rowSteps > maxSteps ? rowSteps : maxSteps;
  }

  lcd.clear();
  const unsigned long pageStartMs = millis();

  if (durationMs < maxSteps) {
    for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
      const uint16_t sourceLength = SCREEN_COLS + pageLineLengths[pageIndex][rowIndex] + SCREEN_COLS;
      const uint16_t rowSteps = sourceLength >= SCREEN_COLS ? sourceLength - SCREEN_COLS + 1 : 1;
      const uint16_t windowStart = scrollRight ? 0 : rowSteps - 1;

      lcd.setCursor(0, rowIndex);
      writeScrollWindow(pageIndex, rowIndex, windowStart);
    }

    delay(durationMs);
    return;
  }

  uint16_t renderedStep = 0;
  bool hasRenderedStep = false;

  while (renderedStep < maxSteps) {
    const unsigned long elapsedMs = millis() - pageStartMs;

    if (elapsedMs >= durationMs) {
      break;
    }

    uint16_t targetStep = (elapsedMs * maxSteps) / durationMs;

    if (targetStep > maxSteps - 1) {
      targetStep = maxSteps - 1;
    }

    if (targetStep == renderedStep && hasRenderedStep) {
      delay(1);
      continue;
    }

    renderedStep = targetStep;
    hasRenderedStep = true;

    for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
      const uint16_t sourceLength = SCREEN_COLS + pageLineLengths[pageIndex][rowIndex] + SCREEN_COLS;
      const uint16_t rowSteps = sourceLength >= SCREEN_COLS ? sourceLength - SCREEN_COLS + 1 : 1;
      const uint16_t scaledStep = rowSteps <= 1 || maxSteps <= 1
        ? 0
        : (renderedStep * (rowSteps - 1)) / (maxSteps - 1);
      const uint16_t windowStart = scrollRight ? (rowSteps - 1) - scaledStep : scaledStep;

      lcd.setCursor(0, rowIndex);
      writeScrollWindow(pageIndex, rowIndex, windowStart);
    }
  }

  const uint16_t finalStep = maxSteps - 1;

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    const uint16_t sourceLength = SCREEN_COLS + pageLineLengths[pageIndex][rowIndex] + SCREEN_COLS;
    const uint16_t rowSteps = sourceLength >= SCREEN_COLS ? sourceLength - SCREEN_COLS + 1 : 1;
    const uint16_t scaledStep = rowSteps <= 1 || maxSteps <= 1
      ? 0
      : (finalStep * (rowSteps - 1)) / (maxSteps - 1);
    const uint16_t windowStart = scrollRight ? (rowSteps - 1) - scaledStep : scaledStep;

    lcd.setCursor(0, rowIndex);
    writeScrollWindow(pageIndex, rowIndex, windowStart);
  }

  const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);

  if (remainingMs > 0) {
    delay(remainingMs);
  }
}`
}

function renderStaticPageHelper() {
  return `void renderStaticPage(uint8_t pageIndex) {
  String rows[SCREEN_ROWS];
  const PageConfig& page = pages[pageIndex];

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    rows[rowIndex] = fitRow(String(page.rows[rowIndex]));
  }

  lcd.clear();
  printPageRows(rows);
}`
}

function renderReplacePageHelper() {
  return `void renderReplacePage(uint8_t pageIndex, unsigned long durationMs) {
  renderStaticPage(pageIndex);
  delay(durationMs);
}`
}

function renderTypewriterPageHelper() {
  return `void renderTypewriterPage(uint8_t pageIndex, unsigned long durationMs) {
  String flattened = "";
  const PageConfig& page = pages[pageIndex];

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    flattened += fitRow(String(page.rows[rowIndex]));
  }

  const uint16_t totalCharacters = flattened.length();

  if (totalCharacters == 0) {
    lcd.clear();
    delay(durationMs);
    return;
  }

  lcd.clear();
  const unsigned long pageStartMs = millis();
  uint16_t renderedCharacters = 0;

  if (durationMs < totalCharacters) {
    renderStaticPage(pageIndex);
    const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);

    if (remainingMs > 0) {
      delay(remainingMs);
    }

    return;
  }

  while (renderedCharacters < totalCharacters) {
    const unsigned long elapsedMs = millis() - pageStartMs;

    if (elapsedMs >= durationMs) {
      break;
    }

    uint16_t targetCharacters = (elapsedMs * totalCharacters) / durationMs;

    if (targetCharacters > totalCharacters) {
      targetCharacters = totalCharacters;
    }

    if (targetCharacters == renderedCharacters) {
      delay(1);
      continue;
    }

    while (renderedCharacters < targetCharacters) {
      const uint8_t rowIndex = renderedCharacters / SCREEN_COLS;
      const uint8_t columnIndex = renderedCharacters % SCREEN_COLS;
      lcd.setCursor(columnIndex, rowIndex);
      lcd.print(flattened.charAt(renderedCharacters));
      renderedCharacters++;
    }
  }

  while (renderedCharacters < totalCharacters) {
    const uint8_t rowIndex = renderedCharacters / SCREEN_COLS;
    const uint8_t columnIndex = renderedCharacters % SCREEN_COLS;
    lcd.setCursor(columnIndex, rowIndex);
    lcd.print(flattened.charAt(renderedCharacters));
    renderedCharacters++;
  }

  const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);

  if (remainingMs > 0) {
    delay(remainingMs);
  }
}`
}

function renderBuildScrollSourceHelper() {
  return `String buildScrollSource(const String& rowText) {
  return repeatSpaces(SCREEN_COLS) + rowText + repeatSpaces(SCREEN_COLS);
}`
}

function renderScrollPageHelper() {
  return `void renderScrollPage(uint8_t pageIndex, bool scrollRight, unsigned long durationMs) {
  String scrollSources[SCREEN_ROWS];
  uint16_t maxSteps = 1;
  const PageConfig& page = pages[pageIndex];

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    scrollSources[rowIndex] = buildScrollSource(String(page.rows[rowIndex]));
    const uint16_t rowLength = scrollSources[rowIndex].length();
    const uint16_t rowSteps = rowLength >= SCREEN_COLS ? rowLength - SCREEN_COLS + 1 : 1;
    maxSteps = rowSteps > maxSteps ? rowSteps : maxSteps;
  }

  lcd.clear();
  const unsigned long pageStartMs = millis();

  if (durationMs < maxSteps) {
    for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
      const uint16_t rowLength = scrollSources[rowIndex].length();
      const uint16_t rowSteps = rowLength >= SCREEN_COLS ? rowLength - SCREEN_COLS + 1 : 1;
      const uint16_t windowStart = scrollRight ? 0 : rowSteps - 1;

      lcd.setCursor(0, rowIndex);
      lcd.print(scrollSources[rowIndex].substring(windowStart, windowStart + SCREEN_COLS));
    }

    delay(durationMs);
    return;
  }

  uint16_t renderedStep = 0;
  bool hasRenderedStep = false;

  while (renderedStep < maxSteps) {
    const unsigned long elapsedMs = millis() - pageStartMs;

    if (elapsedMs >= durationMs) {
      break;
    }

    uint16_t targetStep = (elapsedMs * maxSteps) / durationMs;

    if (targetStep > maxSteps - 1) {
      targetStep = maxSteps - 1;
    }

    if (targetStep == renderedStep && hasRenderedStep) {
      delay(1);
      continue;
    }

    renderedStep = targetStep;
    hasRenderedStep = true;

    for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
      const uint16_t rowLength = scrollSources[rowIndex].length();
      const uint16_t rowSteps = rowLength >= SCREEN_COLS ? rowLength - SCREEN_COLS + 1 : 1;
      const uint16_t scaledStep = rowSteps <= 1 || maxSteps <= 1
        ? 0
        : (renderedStep * (rowSteps - 1)) / (maxSteps - 1);
      const uint16_t windowStart = scrollRight ? (rowSteps - 1) - scaledStep : scaledStep;

      lcd.setCursor(0, rowIndex);
      lcd.print(scrollSources[rowIndex].substring(windowStart, windowStart + SCREEN_COLS));
    }
  }

  const uint16_t finalStep = maxSteps - 1;

  for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
    const uint16_t rowLength = scrollSources[rowIndex].length();
    const uint16_t rowSteps = rowLength >= SCREEN_COLS ? rowLength - SCREEN_COLS + 1 : 1;
    const uint16_t scaledStep = rowSteps <= 1 || maxSteps <= 1
      ? 0
      : (finalStep * (rowSteps - 1)) / (maxSteps - 1);
    const uint16_t windowStart = scrollRight ? (rowSteps - 1) - scaledStep : scaledStep;

    lcd.setCursor(0, rowIndex);
    lcd.print(scrollSources[rowIndex].substring(windowStart, windowStart + SCREEN_COLS));
  }

  const unsigned long remainingMs = durationMs - min(durationMs, millis() - pageStartMs);

  if (remainingMs > 0) {
    delay(remainingMs);
  }
}`
}

function renderCountdownHelper() {
  return `void runCountdown() {
  if (START_COUNTDOWN_SECONDS == 0) {
    return;
  }

  for (int seconds = START_COUNTDOWN_SECONDS; seconds > 0; seconds--) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Starting in");
    lcd.setCursor(0, SCREEN_ROWS > 1 ? 1 : 0);
    lcd.print(seconds);
    delay(1000);
  }

  lcd.clear();
}`
}

function renderPageDispatcher(model: ArduinoExportModel) {
  const loadCustomCharacters = model.usesSpecialText ? '  loadPageCustomCharacters(pageIndex);\n' : ''

  if (model.usesOnlyStaticReplace) {
    return `void renderPage(uint8_t pageIndex) {
${loadCustomCharacters}  renderReplacePage(pageIndex, pages[pageIndex].durationMs);
}`
  }

  if (model.usesScroll && model.usesTypewriter) {
    return `void renderPage(uint8_t pageIndex) {
${loadCustomCharacters}  const PageConfig& page = pages[pageIndex];
  const unsigned long durationMs = page.durationMs;
  const uint8_t mode = page.mode;
  const uint8_t animation = page.animation;

  if (mode == PAGE_MODE_SCROLL) {
    renderScrollPage(pageIndex, animation == ANIMATION_SCROLL_RIGHT, durationMs);
    return;
  }

  if (animation == ANIMATION_TYPEWRITER) {
    renderTypewriterPage(pageIndex, durationMs);
    return;
  }

  renderReplacePage(pageIndex, durationMs);
}`
  }

  if (model.usesScroll) {
    return `void renderPage(uint8_t pageIndex) {
${loadCustomCharacters}  const PageConfig& page = pages[pageIndex];
  const unsigned long durationMs = page.durationMs;

  if (page.mode == PAGE_MODE_SCROLL) {
    renderScrollPage(pageIndex, page.animation == ANIMATION_SCROLL_RIGHT, durationMs);
    return;
  }

  renderReplacePage(pageIndex, durationMs);
}`
  }

  if (model.usesTypewriter) {
    return `void renderPage(uint8_t pageIndex) {
${loadCustomCharacters}  const PageConfig& page = pages[pageIndex];
  const unsigned long durationMs = page.durationMs;

  if (page.animation == ANIMATION_TYPEWRITER) {
    renderTypewriterPage(pageIndex, durationMs);
    return;
  }

  renderReplacePage(pageIndex, durationMs);
}`
  }

  return `void renderPage(uint8_t pageIndex) {
${loadCustomCharacters}  renderReplacePage(pageIndex, pages[pageIndex].durationMs);
}`
}

function renderSetupFunction(model: ArduinoExportModel) {
  const lines = [
    'void setup() {',
    '  lcd.init();',
    '  lcd.backlight();',
  ]

  if (model.usesCountdown) {
    lines.push('  runCountdown();')
  }

  lines.push('}')

  return lines.join('\n')
}

function renderRuntimeHelpers(model: ArduinoExportModel) {
  const helpers = [
    renderFitRowHelper(),
    renderPrintPageRowsHelper(),
    renderStaticPageHelper(),
    renderReplacePageHelper(),
  ]

  if (model.usesTypewriter || model.usesScroll) {
    helpers.unshift(renderRepeatSpacesHelper())
  }

  if (model.usesTypewriter) {
    helpers.push(renderTypewriterPageHelper())
  }

  if (model.usesScroll) {
    helpers.push(renderBuildScrollSourceHelper(), renderScrollPageHelper())
  }

  if (model.usesCountdown) {
    helpers.push(renderCountdownHelper())
  }

  helpers.push(renderPageDispatcher(model), renderSetupFunction(model), `void loop() {
  for (uint8_t pageIndex = 0; pageIndex < PAGE_COUNT; pageIndex++) {
    renderPage(pageIndex);
  }
}`)

  return `${renderArduinoSectionComment('Runtime Helpers', 'These functions drive playback. Most projects only need the config above.')}\n${helpers.join('\n\n')}`
}

function renderSpecialRuntimeHelpers(model: ArduinoExportModel) {
  const helpers = [
    renderSpecialPageByteHelpers(),
    renderSpecialStaticPageHelper(),
    renderReplacePageHelper(),
  ]

  if (model.usesTypewriter) {
    helpers.push(renderSpecialTypewriterPageHelper())
  }

  if (model.usesScroll) {
    helpers.push(renderSpecialScrollPageHelper())
  }

  if (model.usesCountdown) {
    helpers.push(renderCountdownHelper())
  }

  helpers.push(renderPageDispatcher(model), renderSetupFunction(model), `void loop() {
  for (uint8_t pageIndex = 0; pageIndex < PAGE_COUNT; pageIndex++) {
    renderPage(pageIndex);
  }
}`)

  return `${renderArduinoSectionComment('Runtime Helpers', 'These functions drive playback. Most projects only need the config above.')}\n${helpers.join('\n\n')}`
}

function renderUltraSimpleStaticLoop() {
  return `void loop() {
  for (uint8_t pageIndex = 0; pageIndex < PAGE_COUNT; pageIndex++) {
    lcd.clear();

    for (uint8_t rowIndex = 0; rowIndex < SCREEN_ROWS; rowIndex++) {
      lcd.setCursor(0, rowIndex);
      lcd.print(fitRow(String(pageLines[pageIndex][rowIndex])));
    }

    delay(pageDurations[pageIndex]);
  }
}`
}

function renderUltraSimpleStaticRuntimeHelpers() {
  return `${renderArduinoSectionComment('Runtime Helpers', 'These functions drive playback. Most projects only need the config above.')}\n${renderFitRowHelper()}\n\nvoid setup() {
  lcd.init();
  lcd.backlight();
}\n\n${renderUltraSimpleStaticLoop()}`
}

function renderUltraSimpleStaticIno(model: ArduinoExportModel) {
  return `// PixelLyric Arduino LCD export
// Project: ${model.projectName}
// Screen: ${model.screenType}
// Requires: LiquidCrystal_I2C library
// If your display does not respond, try changing LCD_ADDRESS from 0x27 to 0x3F.

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

${renderArduinoSectionComment('User Config', 'Adjust these values first when wiring or retiming the display.')}
const uint8_t LCD_ADDRESS = 0x27;
const uint8_t SCREEN_COLS = ${model.screenColumns};
const uint8_t SCREEN_ROWS = ${model.screenRows};
const uint8_t PAGE_COUNT = ${model.pageCount};

LiquidCrystal_I2C lcd(LCD_ADDRESS, SCREEN_COLS, SCREEN_ROWS);

${renderUltraSimpleStaticPageData(model)}

${renderUltraSimpleStaticRuntimeHelpers()}
`
}

function renderSpecialArduinoIno(model: ArduinoExportModel) {
  return `// PixelLyric Arduino LCD export
// Project: ${model.projectName}
// Screen: ${model.screenType}
// Requires: LiquidCrystal_I2C library
// If your display does not respond, try changing LCD_ADDRESS from 0x27 to 0x3F.

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

${renderArduinoSectionComment('User Config', 'Adjust these values first when wiring or retiming the display.')}
const uint8_t LCD_ADDRESS = 0x27;
const uint8_t SCREEN_COLS = ${model.screenColumns};
const uint8_t SCREEN_ROWS = ${model.screenRows};
const uint8_t PAGE_COUNT = ${model.pageCount};
const uint8_t START_COUNTDOWN_SECONDS = ${model.countdownSeconds};

LiquidCrystal_I2C lcd(LCD_ADDRESS, SCREEN_COLS, SCREEN_ROWS);

${renderPageModeEnum(model)}

${renderPageAnimationEnum()}

struct PageConfig {
  uint8_t mode;
  uint8_t animation;
  unsigned long durationMs;
};

${renderSpecialCharacterDefinitions(model)}

${renderSpecialArduinoPageData(model)}

${renderSpecialRuntimeHelpers(model)}
`
}

function renderArduinoIno(model: ArduinoExportModel) {
  return `// PixelLyric Arduino LCD export
// Project: ${model.projectName}
// Screen: ${model.screenType}
// Requires: LiquidCrystal_I2C library
// If your display does not respond, try changing LCD_ADDRESS from 0x27 to 0x3F.

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

${renderArduinoSectionComment('User Config', 'Adjust these values first when wiring or retiming the display.')}
const uint8_t LCD_ADDRESS = 0x27;
const uint8_t SCREEN_COLS = ${model.screenColumns};
const uint8_t SCREEN_ROWS = ${model.screenRows};
const uint8_t PAGE_COUNT = ${model.pageCount};
const uint8_t START_COUNTDOWN_SECONDS = ${model.countdownSeconds};

LiquidCrystal_I2C lcd(LCD_ADDRESS, SCREEN_COLS, SCREEN_ROWS);

${renderPageModeEnum(model)}

${renderPageAnimationEnum()}

struct PageConfig {
  uint8_t mode;
  uint8_t animation;
  unsigned long durationMs;
  const char* const* rows;
};

${renderArduinoPageData(model)}

${renderRuntimeHelpers(model)}
`
}

export function serializeProjectInoContent(document: PixelLyricProjectDocument) {
  const model = buildArduinoExportModel(document)
  if (model.usesSpecialText) {
    return renderSpecialArduinoIno(model)
  }

  return model.usesUltraSimpleStaticTemplate ? renderUltraSimpleStaticIno(model) : renderArduinoIno(model)
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

export function downloadProjectIno(document: PixelLyricProjectDocument, fileName?: string) {
  const content = serializeProjectInoContent(document)
  const nextFileName = fileName ?? getProjectFileName(document.projectName, PROJECT_INO_EXTENSION)
  downloadTextFile(content, nextFileName, 'text/plain;charset=utf-8')
}

export function downloadTextContentFile(content: string, fileName: string, mimeType = 'text/plain;charset=utf-8') {
  downloadTextFile(content, fileName, mimeType)
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  if (!documentRef) {
    throw new Error('File downloads are only available in the browser')
  }

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

const documentRef = typeof document === 'undefined' ? null : document
