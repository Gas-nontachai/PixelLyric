import { startTransition, type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_DURATION_MS,
  SCREEN_PRESETS,
  createBlankPage,
  createInitialPage,
  createDuplicatedPage,
  getAudioTimelinePositionMs,
  getPageAudioStartMs,
  getPresetById,
  getScriptDurationMs,
  getVisibleRows,
  normalizePageText,
  normalizeRowTexts,
  parseDurationInput,
  type DurationUnit,
  type LcdAnimation,
  type PageMode,
  type PageScript,
  type ProjectAudioTrack,
  type ScreenPresetId,
} from '@/lib/lcd'
import {
  createProjectDocument as buildProjectDocument,
  downloadProjectJson,
  downloadProjectDocument,
  getProjectFileName,
  normalizeProjectName,
  parseProjectNameFromFileName,
  parseProjectDocumentText,
  projectDocumentToState,
  serializeProjectDocument,
  type PixelLyricProjectDocument,
} from '@/lib/project-file'
import {
  isProjectFilePickerAbort,
  pickProjectSaveFileHandle,
  writeProjectFile,
  type ProjectFileHandle,
} from '@/lib/project-file-system'

type PlaybackState = {
  activePageIndex: number
  isPlaying: boolean
  isLooping: boolean
  pageProgressMs: number
}

type AudioPreviewState = {
  isPlaying: boolean
  positionMs: number
}

type CountdownOption = 0 | 3 | 5 | 10
const COUNTDOWN_OPTIONS: CountdownOption[] = [0, 3, 5, 10]
const MIN_TRIM_GAP_MS = 100
const AUDIO_DRIFT_TOLERANCE_S = 0.45
const AUDIO_CORRECTION_COOLDOWN_MS = 1200

type AudioActionResult = {
  ok: boolean
  message?: string
  wasClamped?: boolean
}

type ProjectActionResult = {
  ok: boolean
  message?: string
}

let untitledProjectCounter = 1

function reserveUntitledProjectName(projectName: string) {
  const match = /^Untitled-(\d+)$/i.exec(projectName.trim())

  if (!match) {
    return
  }

  const nextCounter = Number(match[1]) + 1

  if (Number.isFinite(nextCounter)) {
    untitledProjectCounter = Math.max(untitledProjectCounter, nextCounter)
  }
}

function getNextUntitledProjectName() {
  const nextProjectName = `Untitled-${untitledProjectCounter}`
  untitledProjectCounter += 1
  return nextProjectName
}

function clampTrimStartMs(value: number, track: ProjectAudioTrack) {
  return Math.min(Math.max(0, value), Math.max(0, track.trimEndMs - MIN_TRIM_GAP_MS))
}

function clampTrimEndMs(value: number, track: ProjectAudioTrack) {
  return Math.max(Math.min(track.durationMs, value), track.trimStartMs + MIN_TRIM_GAP_MS)
}

function clampPreviewPositionMs(value: number, track: ProjectAudioTrack) {
  return Math.min(Math.max(value, track.trimStartMs), track.trimEndMs)
}

function moveIndex(index: number, direction: 'up' | 'down', length: number) {
  if (direction === 'up') {
    return Math.max(0, index - 1)
  }

  return Math.min(length - 1, index + 1)
}

function normalizePagesForPreset(pages: PageScript[], columns: number, rows: number) {
  return pages.map((page) => ({
    ...page,
    text: normalizePageText(page.text, columns, rows),
    rowTexts: normalizeRowTexts(page.rowTexts, rows),
  }))
}

function pageNeedsProgressRendering(page: PageScript | undefined) {
  if (!page) {
    return false
  }

  return page.mode === 'scroll' || page.animation === 'typewriter'
}

export function useLcdStudio() {
  const [projectName, setProjectName] = useState(() => getNextUntitledProjectName())
  const [isDirty, setIsDirty] = useState(false)
  const [screenType, setScreenType] = useState<ScreenPresetId>('16x2')
  const preset = getPresetById(screenType)
  const [pages, setPages] = useState<PageScript[]>(() => [createInitialPage(preset.rows)])
  const [audioTrack, setAudioTrack] = useState<ProjectAudioTrack | null>(null)
  const [audioPreview, setAudioPreview] = useState<AudioPreviewState>({
    isPlaying: false,
    positionMs: 0,
  })
  const [playback, setPlayback] = useState<PlaybackState>({
    activePageIndex: 0,
    isPlaying: false,
    isLooping: false,
    pageProgressMs: 0,
  })
  const [countdownSeconds, setCountdownSeconds] = useState<CountdownOption>(0)
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null)

  const playbackRef = useRef(playback)
  const pagesRef = useRef(pages)
  const audioTrackRef = useRef(audioTrack)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const currentProjectFileHandleRef = useRef<ProjectFileHandle | null>(null)
  const audioSyncRef = useRef({
    lastCorrectionAt: 0,
    lastPageIndex: -1,
    lastShouldPlay: false,
    lastTargetMs: -1,
  })

  useEffect(() => {
    playbackRef.current = playback
  }, [playback])

  useEffect(() => {
    pagesRef.current = pages
  }, [pages])

  useEffect(() => {
    audioTrackRef.current = audioTrack
  }, [audioTrack])

  useEffect(() => {
    return () => {
      const audioElement = audioElementRef.current

      if (audioElement) {
        audioElement.pause()
        audioElement.removeAttribute('src')
        audioElement.load()
      }

      if (audioTrackRef.current?.objectUrl) {
        URL.revokeObjectURL(audioTrackRef.current.objectUrl)
      }
    }
  }, [])

  const ensureAudioElement = useCallback(() => {
    if (!audioElementRef.current) {
      const audioElement = new Audio()
      audioElement.preload = 'auto'
      audioElementRef.current = audioElement
    }

    return audioElementRef.current
  }, [])

  const syncPreviewPosition = useCallback(() => {
    const track = audioTrackRef.current
    const audioElement = audioElementRef.current

    if (!track || !audioElement) {
      return
    }

    const currentPositionMs = clampPreviewPositionMs(Math.round(audioElement.currentTime * 1000), track)

    setAudioPreview((currentPreview) => ({
      ...currentPreview,
      positionMs: currentPositionMs,
    }))
  }, [])

  const stopAudioPreview = useCallback((nextPositionMs?: number) => {
    const audioElement = audioElementRef.current

    if (audioElement && !audioElement.paused) {
      audioElement.pause()
    }

    setAudioPreview((currentPreview) => ({
      isPlaying: false,
      positionMs: nextPositionMs ?? currentPreview.positionMs,
    }))
  }, [])

  const replaceAudioTrack = useCallback((nextTrack: ProjectAudioTrack | null, nextPositionMs?: number) => {
    const previousObjectUrl = audioTrackRef.current?.objectUrl
    const audioElement = nextTrack ? ensureAudioElement() : audioElementRef.current

    if (audioElement) {
      audioElement.pause()

      if (nextTrack) {
        audioElement.src = nextTrack.objectUrl
      } else {
        audioElement.removeAttribute('src')
      }

      audioElement.load()
    }

    audioTrackRef.current = nextTrack
    setAudioTrack(nextTrack)
    setAudioPreview({
      isPlaying: false,
      positionMs: nextTrack ? clampPreviewPositionMs(nextPositionMs ?? nextTrack.trimStartMs, nextTrack) : 0,
    })

    if (previousObjectUrl && previousObjectUrl !== nextTrack?.objectUrl) {
      URL.revokeObjectURL(previousObjectUrl)
    }
  }, [ensureAudioElement])

  const syncAudioToTimeline = useCallback(({
    pageIndex,
    pageProgressMs,
    shouldPlay,
    forceSeek = false,
  }: {
    pageIndex: number
    pageProgressMs: number
    shouldPlay: boolean
    forceSeek?: boolean
  }) => {
    const track = audioTrackRef.current

    if (!track) {
      const audioElement = audioElementRef.current

      if (audioElement && !audioElement.paused) {
        audioElement.pause()
      }

      return
    }

    const audioElement = ensureAudioElement()
    const targetMs = getAudioTimelinePositionMs(track, pagesRef.current, pageIndex, pageProgressMs)

    if (targetMs >= track.trimEndMs) {
      if (!audioElement.paused) {
        audioElement.pause()
      }

      return
    }

    const targetSeconds = targetMs / 1000
    const now = performance.now()
    const driftSeconds = Math.abs(audioElement.currentTime - targetSeconds)
    const syncState = audioSyncRef.current
    const hasTimelineJump =
      targetMs < syncState.lastTargetMs ||
      Math.abs(targetMs - syncState.lastTargetMs) > 1200
    const shouldCorrectDrift =
      shouldPlay &&
      now - syncState.lastCorrectionAt >= AUDIO_CORRECTION_COOLDOWN_MS &&
      driftSeconds > AUDIO_DRIFT_TOLERANCE_S
    const shouldSeek = forceSeek || audioElement.paused || hasTimelineJump || shouldCorrectDrift

    if (shouldSeek) {
      audioElement.currentTime = targetSeconds
      syncState.lastCorrectionAt = now
    }

    if (!shouldPlay) {
      if (!audioElement.paused) {
        audioElement.pause()
      }

      syncState.lastPageIndex = pageIndex
      syncState.lastShouldPlay = shouldPlay
      syncState.lastTargetMs = targetMs

      return
    }

    if (audioElement.paused) {
      void audioElement.play().catch(() => {})
    }

    syncState.lastPageIndex = pageIndex
    syncState.lastShouldPlay = shouldPlay
    syncState.lastTargetMs = targetMs
  }, [ensureAudioElement])

  const syncAudioTailPlayback = useCallback((shouldPlay: boolean) => {
    const track = audioTrackRef.current

    if (!track) {
      return true
    }

    const audioElement = ensureAudioElement()

    if (audioElement.currentTime * 1000 >= track.trimEndMs - MIN_TRIM_GAP_MS) {
      audioElement.pause()
      return true
    }

    if (!shouldPlay) {
      audioElement.pause()
      return false
    }

    if (audioElement.paused) {
      void audioElement.play().catch(() => {})
    }

    return false
  }, [ensureAudioElement])

  useEffect(() => {
    if (!audioPreview.isPlaying) {
      return
    }

    let animationFrameId = 0

    const tick = () => {
      const track = audioTrackRef.current
      const audioElement = audioElementRef.current

      if (!track || !audioElement) {
        setAudioPreview((currentPreview) => ({
          ...currentPreview,
          isPlaying: false,
        }))
        return
      }

      const currentPositionMs = Math.round(audioElement.currentTime * 1000)

      if (currentPositionMs >= track.trimEndMs - MIN_TRIM_GAP_MS) {
        audioElement.pause()
        setAudioPreview({
          isPlaying: false,
          positionMs: track.trimEndMs,
        })
        return
      }

      setAudioPreview((currentPreview) => ({
        ...currentPreview,
        positionMs: clampPreviewPositionMs(currentPositionMs, track),
      }))

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [audioPreview.isPlaying])

  useEffect(() => {
    if (!playback.isPlaying) {
      return
    }

    let animationFrameId = 0
    let previousTimestamp: number | null = null

    const tick = (timestamp: number) => {
      if (previousTimestamp === null) {
        previousTimestamp = timestamp
      }

      const deltaMs = timestamp - previousTimestamp
      previousTimestamp = timestamp

      const latestPlayback = playbackRef.current
      const latestPages = pagesRef.current

      if (!latestPages.length) {
        animationFrameId = requestAnimationFrame(tick)
        return
      }

      let nextPageIndex = latestPlayback.activePageIndex
      let nextProgressMs = latestPlayback.pageProgressMs + deltaMs
      let shouldStop = false
      let shouldUseTimelineSync = true

      while (latestPages[nextPageIndex] && nextProgressMs >= latestPages[nextPageIndex].durationMs) {
        if (!latestPlayback.isLooping && nextPageIndex === latestPages.length - 1) {
          nextProgressMs = latestPages[nextPageIndex].durationMs
          const track = audioTrackRef.current
          const finalPageAudioEndMs = track
            ? getAudioTimelinePositionMs(track, latestPages, nextPageIndex, latestPages[nextPageIndex].durationMs)
            : null
          const hasAudioTail = track !== null && finalPageAudioEndMs !== null && finalPageAudioEndMs < track.trimEndMs

          shouldUseTimelineSync = !hasAudioTail
          shouldStop = !hasAudioTail
          break
        }

        nextProgressMs -= latestPages[nextPageIndex].durationMs
        nextPageIndex = (nextPageIndex + 1) % latestPages.length
      }

      if (shouldUseTimelineSync) {
        syncAudioToTimeline({
          pageIndex: nextPageIndex,
          pageProgressMs: nextProgressMs,
          shouldPlay: !shouldStop && latestPlayback.isPlaying,
        })
      } else {
        shouldStop = syncAudioTailPlayback(latestPlayback.isPlaying)
      }

      const nextIsPlaying = shouldStop ? false : latestPlayback.isPlaying
      const nextPlaybackState = {
        ...latestPlayback,
        activePageIndex: nextPageIndex,
        isPlaying: nextIsPlaying,
        pageProgressMs: nextProgressMs,
      }

      playbackRef.current = nextPlaybackState

      const shouldCommitPlaybackState =
        nextPageIndex !== latestPlayback.activePageIndex ||
        nextIsPlaying !== latestPlayback.isPlaying ||
        pageNeedsProgressRendering(latestPages[nextPageIndex])

      if (shouldCommitPlaybackState) {
        startTransition(() => {
          setPlayback(nextPlaybackState)
        })
      }

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [playback.isPlaying, syncAudioTailPlayback, syncAudioToTimeline])

  useEffect(() => {
    if (countdownRemaining === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (countdownRemaining <= 1) {
        setCountdownRemaining(null)
        setPlayback((currentPlayback) => ({
          ...currentPlayback,
          isPlaying: true,
        }))
        return
      }

      setCountdownRemaining((currentValue) => (currentValue === null ? null : currentValue - 1))
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [countdownRemaining])

  useEffect(() => {
    const latestPlayback = playbackRef.current

    syncAudioToTimeline({
      pageIndex: latestPlayback.activePageIndex,
      pageProgressMs: latestPlayback.pageProgressMs,
      shouldPlay: latestPlayback.isPlaying,
      forceSeek: true,
    })
  }, [
    audioTrack?.objectUrl,
    audioTrack?.trimStartMs,
    audioTrack?.trimEndMs,
    syncAudioToTimeline,
  ])

  const resetPlaybackToPage = (pageIndex: number, shouldPlay = false) => {
    stopAudioPreview()
    setCountdownRemaining(null)
    setPlayback((currentPlayback) => ({
      ...currentPlayback,
      activePageIndex: pageIndex,
      isPlaying: shouldPlay,
      pageProgressMs: 0,
    }))
    syncAudioToTimeline({
      pageIndex,
      pageProgressMs: 0,
      shouldPlay,
      forceSeek: true,
    })
  }

  const updatePage = (pageIndex: number, updater: (page: PageScript) => PageScript) => {
    setPages((currentPages) =>
      currentPages.map((page, index) => (index === pageIndex ? updater(page) : page)),
    )
  }

  const handleScreenTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScreenType = event.target.value as ScreenPresetId
    const nextPreset = getPresetById(nextScreenType)

    setScreenType(nextScreenType)
    setPages((currentPages) =>
      normalizePagesForPreset(currentPages, nextPreset.columns, nextPreset.rows),
    )
    setPlayback((currentPlayback) => ({
      ...currentPlayback,
      pageProgressMs: 0,
    }))
    setIsDirty(true)
  }

  const handleSelectPage = (pageIndex: number) => {
    resetPlaybackToPage(pageIndex, false)
  }

  const handleAddPage = () => {
    const nextPage = createBlankPage(preset.rows)

    setPages((currentPages) => [...currentPages, nextPage])
    resetPlaybackToPage(pages.length, false)
    setIsDirty(true)
  }

  const handleDuplicatePage = (pageIndex: number) => {
    setPages((currentPages) => {
      const duplicatedPage = createDuplicatedPage(currentPages[pageIndex], preset.rows)
      const nextPages = [...currentPages]
      nextPages.splice(pageIndex + 1, 0, duplicatedPage)
      return nextPages
    })

    resetPlaybackToPage(pageIndex + 1, false)
    setIsDirty(true)
  }

  const handleDeletePage = (pageIndex: number) => {
    if (pages.length === 1) {
      return
    }

    setPages((currentPages) => currentPages.filter((_, index) => index !== pageIndex))
    resetPlaybackToPage(Math.max(0, pageIndex - 1), false)
    setIsDirty(true)
  }

  const handleMovePage = (pageIndex: number, direction: 'up' | 'down') => {
    const nextIndex = moveIndex(pageIndex, direction, pages.length)

    if (nextIndex === pageIndex) {
      return
    }

    setPages((currentPages) => {
      const nextPages = [...currentPages]
      const [movedPage] = nextPages.splice(pageIndex, 1)
      nextPages.splice(nextIndex, 0, movedPage)
      return nextPages
    })

    resetPlaybackToPage(nextIndex, false)
    setIsDirty(true)
  }

  const handlePageModeChange = (pageIndex: number, mode: PageMode) => {
    updatePage(pageIndex, (page) => ({
      ...page,
      mode,
      animation: mode === 'scroll' ? 'scroll-left' : 'replace',
      text: normalizePageText(page.text, preset.columns, preset.rows),
      rowTexts: normalizeRowTexts(page.rowTexts, preset.rows),
    }))
    resetPlaybackToPage(pageIndex, false)
    setIsDirty(true)
  }

  const handlePageAnimationChange = (pageIndex: number, animation: LcdAnimation) => {
    updatePage(pageIndex, (page) => ({ ...page, animation }))
    resetPlaybackToPage(pageIndex, false)
    setIsDirty(true)
  }

  const handlePageTextChange = (pageIndex: number, event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = normalizePageText(event.target.value, preset.columns, preset.rows)
    updatePage(pageIndex, (page) => ({ ...page, text: nextText }))
    setIsDirty(true)
  }

  const handleRowTextChange = (pageIndex: number, rowIndex: number, value: string) => {
    updatePage(pageIndex, (page) => ({
      ...page,
      rowTexts: normalizeRowTexts(page.rowTexts, preset.rows).map((rowText, index) =>
        index === rowIndex ? value : rowText,
      ),
    }))
    setIsDirty(true)
  }

  const handleDurationValueChange = (pageIndex: number, value: string) => {
    let nextDurationMs = DEFAULT_DURATION_MS
    let wasClamped = false

    const page = pagesRef.current[pageIndex]

    if (!page) {
      return {
        durationMs: DEFAULT_DURATION_MS,
        wasClamped: false,
      }
    }

    const parsedDurationMs = parseDurationInput(value, page.durationUnit)

    if (parsedDurationMs === null) {
      return {
        durationMs: page.durationMs,
        wasClamped: false,
      }
    }

    nextDurationMs = Math.max(100, parsedDurationMs)
    wasClamped = nextDurationMs !== parsedDurationMs

    updatePage(pageIndex, (page) => {
      return {
        ...page,
        durationMs: nextDurationMs,
      }
    })

    if (pageIndex === playbackRef.current.activePageIndex) {
      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        pageProgressMs: Math.min(currentPlayback.pageProgressMs, nextDurationMs),
      }))
    }

    setIsDirty(true)

    return {
      durationMs: nextDurationMs,
      wasClamped,
    }
  }

  const handleDurationUnitChange = (pageIndex: number, unit: DurationUnit) => {
    updatePage(pageIndex, (page) => ({
      ...page,
      durationUnit: unit,
      durationMs: Math.max(page.durationMs, DEFAULT_DURATION_MS / 20),
    }))
    setIsDirty(true)
  }

  const handleImportAudioFile = async (file: File | null): Promise<AudioActionResult> => {
    if (!file) {
      return {
        ok: false,
        message: 'No MP3 file selected',
      }
    }

    const isMp3 = file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')

    if (!isMp3) {
      return {
        ok: false,
        message: 'Only MP3 files are supported right now',
      }
    }

    const nextObjectUrl = URL.createObjectURL(file)

    try {
      const durationMs = await new Promise<number>((resolve, reject) => {
        const probeAudio = new Audio()
        const cleanup = () => {
          probeAudio.removeEventListener('loadedmetadata', handleLoadedMetadata)
          probeAudio.removeEventListener('error', handleError)
        }
        const handleLoadedMetadata = () => {
          cleanup()
          resolve(Math.round(probeAudio.duration * 1000))
        }
        const handleError = () => {
          cleanup()
          reject(new Error('Could not read MP3 metadata'))
        }

        probeAudio.preload = 'metadata'
        probeAudio.addEventListener('loadedmetadata', handleLoadedMetadata)
        probeAudio.addEventListener('error', handleError)
        probeAudio.src = nextObjectUrl
      })

      if (!Number.isFinite(durationMs) || durationMs <= MIN_TRIM_GAP_MS) {
        URL.revokeObjectURL(nextObjectUrl)
        return {
          ok: false,
          message: 'This MP3 is too short to trim',
        }
      }

      replaceAudioTrack({
        name: file.name,
        sourceFile: file,
        objectUrl: nextObjectUrl,
        durationMs,
        trimStartMs: 0,
        trimEndMs: durationMs,
      }, 0)

      syncAudioToTimeline({
        pageIndex: playbackRef.current.activePageIndex,
        pageProgressMs: playbackRef.current.pageProgressMs,
        shouldPlay: playbackRef.current.isPlaying,
        forceSeek: true,
      })

      setIsDirty(true)

      return { ok: true }
    } catch {
      URL.revokeObjectURL(nextObjectUrl)
      return {
        ok: false,
        message: 'Import failed. Try another MP3 file.',
      }
    }
  }

  const handleClearAudio = () => {
    replaceAudioTrack(null, 0)
    setIsDirty(true)
  }

  const applyProjectState = useCallback((nextProjectState: {
    projectName: string
    screenType: ScreenPresetId
    countdownSeconds: CountdownOption
    pages: PageScript[]
    audioTrack: ProjectAudioTrack | null
    projectFileHandle?: ProjectFileHandle | null
    isDirty?: boolean
  }) => {
    const nextPreset = getPresetById(nextProjectState.screenType)
    const nextProjectName = normalizeProjectName(nextProjectState.projectName)
    const nextPages = normalizePagesForPreset(
      nextProjectState.pages.length > 0
        ? nextProjectState.pages
        : [createInitialPage(nextPreset.rows)],
      nextPreset.columns,
      nextPreset.rows,
    )
    const nextPlaybackState: PlaybackState = {
      activePageIndex: 0,
      isPlaying: false,
      isLooping: false,
      pageProgressMs: 0,
    }

    stopAudioPreview(nextProjectState.audioTrack?.trimStartMs ?? 0)
    setCountdownRemaining(null)
    currentProjectFileHandleRef.current = nextProjectState.projectFileHandle ?? null
    reserveUntitledProjectName(nextProjectName)
    setProjectName(nextProjectName)
    setScreenType(nextProjectState.screenType)
    pagesRef.current = nextPages
    setPages(nextPages)
    setCountdownSeconds(nextProjectState.countdownSeconds)
    setIsDirty(nextProjectState.isDirty ?? false)
    playbackRef.current = nextPlaybackState
    setPlayback(nextPlaybackState)
    replaceAudioTrack(nextProjectState.audioTrack, nextProjectState.audioTrack?.trimStartMs ?? 0)

    syncAudioToTimeline({
      pageIndex: 0,
      pageProgressMs: 0,
      shouldPlay: false,
      forceSeek: true,
    })
  }, [replaceAudioTrack, stopAudioPreview, syncAudioToTimeline])

  const createProjectSnapshot = useCallback(async () => {
    return buildProjectDocument({
      projectName,
      screenType,
      countdownSeconds,
      pages: pagesRef.current,
      audioTrack: audioTrackRef.current,
    })
  }, [countdownSeconds, projectName, screenType])

  const loadProjectSnapshot = useCallback(async (
    document: PixelLyricProjectDocument,
    options?: {
      source?: 'autosave' | 'file'
      fallbackProjectName?: string
      projectFileHandle?: ProjectFileHandle | null
    },
  ): Promise<ProjectActionResult> => {
    try {
      const nextProjectState = await projectDocumentToState(document)
      const nextProjectName = document.projectName || options?.fallbackProjectName || getNextUntitledProjectName()

      applyProjectState({
        ...nextProjectState,
        projectName: nextProjectName,
        projectFileHandle: options?.projectFileHandle ?? null,
        isDirty: options?.source === 'autosave',
      })

      return {
        ok: true,
        message: options?.source === 'autosave' ? 'Autosaved project restored' : 'Project opened',
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not load the project',
      }
    }
  }, [applyProjectState])

  const saveProjectAs = useCallback(async (nextProjectName?: string): Promise<ProjectActionResult> => {
    const providedProjectName = nextProjectName?.trim()

    if (!providedProjectName) {
      return {
        ok: false,
      }
    }

    const normalizedNextProjectName = normalizeProjectName(providedProjectName)

    try {
      const projectDocument = await buildProjectDocument({
        projectName: normalizedNextProjectName,
        screenType,
        countdownSeconds,
        pages: pagesRef.current,
        audioTrack: audioTrackRef.current,
      })

      const suggestedFileName = getProjectFileName(normalizedNextProjectName)
      const fileHandle = await pickProjectSaveFileHandle(suggestedFileName)

      if (fileHandle) {
        await writeProjectFile(fileHandle, serializeProjectDocument(projectDocument))
        currentProjectFileHandleRef.current = fileHandle
      } else {
        downloadProjectDocument(projectDocument, suggestedFileName)
        currentProjectFileHandleRef.current = null
      }

      reserveUntitledProjectName(normalizedNextProjectName)
      setProjectName(normalizedNextProjectName)
      setIsDirty(false)

      return {
        ok: true,
        message: `Saved as ${normalizedNextProjectName}`,
      }
    } catch (error) {
      if (isProjectFilePickerAbort(error)) {
        return {
          ok: false,
        }
      }

      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not save the project',
      }
    }
  }, [countdownSeconds, screenType])

  const saveProject = useCallback(async (): Promise<ProjectActionResult> => {
    const currentFileHandle = currentProjectFileHandleRef.current

    if (!currentFileHandle) {
      return saveProjectAs(projectName)
    }

    try {
      const projectDocument = await createProjectSnapshot()
      await writeProjectFile(currentFileHandle, serializeProjectDocument(projectDocument))
      setIsDirty(false)

      return {
        ok: true,
        message: 'Project saved',
      }
    } catch (error) {
      currentProjectFileHandleRef.current = null

      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not save the project',
      }
    }
  }, [createProjectSnapshot, projectName, saveProjectAs])

  const exportProject = useCallback(async (): Promise<ProjectActionResult> => {
    try {
      const projectDocument = await createProjectSnapshot()
      downloadProjectJson(projectDocument)

      return {
        ok: true,
        message: 'Project exported as JSON',
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not export the project',
      }
    }
  }, [createProjectSnapshot])

  const renameProject = useCallback((nextProjectName: string): ProjectActionResult => {
    const normalizedNextProjectName = normalizeProjectName(nextProjectName)

    if (normalizedNextProjectName === projectName) {
      return {
        ok: true,
      }
    }

    reserveUntitledProjectName(normalizedNextProjectName)
    setProjectName(normalizedNextProjectName)
    setIsDirty(true)

    return {
      ok: true,
    }
  }, [projectName])

  const newProject = useCallback((): ProjectActionResult => {
    const nextProjectName = getNextUntitledProjectName()

    applyProjectState({
      projectName: nextProjectName,
      screenType: '16x2',
      countdownSeconds: 0,
      pages: [createInitialPage(getPresetById('16x2').rows)],
      audioTrack: null,
      projectFileHandle: null,
      isDirty: false,
    })

    return {
      ok: true,
      message: `Created ${nextProjectName}`,
    }
  }, [applyProjectState])

  const importProjectFile = useCallback(async (
    file: File | null,
    options?: { fileHandle?: ProjectFileHandle | null },
  ): Promise<ProjectActionResult> => {
    if (!file) {
      return {
        ok: false,
        message: 'No project file selected',
      }
    }

    try {
      const projectText = await file.text()
      const projectDocument = parseProjectDocumentText(projectText)
      const result = await loadProjectSnapshot(projectDocument, {
        source: 'file',
        fallbackProjectName: parseProjectNameFromFileName(file.name),
        projectFileHandle: options?.fileHandle ?? null,
      })

      return result.ok
        ? {
            ok: true,
          message: 'Project opened',
          }
        : result
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Could not import the project',
      }
    }
  }, [loadProjectSnapshot])

  const handleTrimStartChange = (nextTrimStartMs: number): AudioActionResult => {
    const track = audioTrackRef.current

    if (!track) {
      return {
        ok: false,
        message: 'Import an MP3 before trimming',
      }
    }

    const clampedTrimStartMs = clampTrimStartMs(Math.round(nextTrimStartMs), track)
    const nextPreviewPositionMs = clampPreviewPositionMs(audioPreview.positionMs, {
      ...track,
      trimStartMs: clampedTrimStartMs,
    })

    setAudioTrack((currentTrack) =>
      currentTrack
        ? {
            ...currentTrack,
            trimStartMs: clampedTrimStartMs,
          }
        : currentTrack,
    )

    setAudioPreview((currentPreview) => ({
      ...currentPreview,
      positionMs: nextPreviewPositionMs,
    }))

    setIsDirty(true)

    if (audioElementRef.current) {
      audioElementRef.current.currentTime = nextPreviewPositionMs / 1000
    }

    return {
      ok: true,
      wasClamped: clampedTrimStartMs !== Math.round(nextTrimStartMs),
    }
  }

  const handleTrimEndChange = (nextTrimEndMs: number): AudioActionResult => {
    const track = audioTrackRef.current

    if (!track) {
      return {
        ok: false,
        message: 'Import an MP3 before trimming',
      }
    }

    const clampedTrimEndMs = clampTrimEndMs(Math.round(nextTrimEndMs), track)
    const nextPreviewPositionMs = clampPreviewPositionMs(audioPreview.positionMs, {
      ...track,
      trimEndMs: clampedTrimEndMs,
    })

    setAudioTrack((currentTrack) =>
      currentTrack
        ? {
            ...currentTrack,
            trimEndMs: clampedTrimEndMs,
          }
        : currentTrack,
    )

    setAudioPreview((currentPreview) => ({
      ...currentPreview,
      isPlaying: currentPreview.isPlaying && nextPreviewPositionMs < clampedTrimEndMs,
      positionMs: nextPreviewPositionMs,
    }))

    setIsDirty(true)

    if (audioElementRef.current) {
      audioElementRef.current.currentTime = nextPreviewPositionMs / 1000
    }

    return {
      ok: true,
      wasClamped: clampedTrimEndMs !== Math.round(nextTrimEndMs),
    }
  }

  const toggleAudioPreviewPlayback = () => {
    const track = audioTrackRef.current

    if (!track) {
      return
    }

    const audioElement = ensureAudioElement()

    if (audioPreview.isPlaying) {
      syncPreviewPosition()
      stopAudioPreview()
      return
    }

    const nextPositionMs =
      audioPreview.positionMs >= track.trimEndMs - MIN_TRIM_GAP_MS
        ? track.trimStartMs
        : clampPreviewPositionMs(audioPreview.positionMs || track.trimStartMs, track)

    setCountdownRemaining(null)
    stopAudioPreview(nextPositionMs)
    setPlayback((currentPlayback) => ({
      ...currentPlayback,
      isPlaying: false,
    }))

    audioElement.currentTime = nextPositionMs / 1000
    void audioElement.play().catch(() => {})

    setAudioPreview({
      isPlaying: true,
      positionMs: nextPositionMs,
    })
  }

  const seekAudioPreview = (nextPositionMs: number) => {
    const track = audioTrackRef.current

    if (!track) {
      return
    }

    const clampedPositionMs = clampPreviewPositionMs(Math.round(nextPositionMs), track)
    const audioElement = ensureAudioElement()

    audioElement.currentTime = clampedPositionMs / 1000
    setAudioPreview((currentPreview) => ({
      ...currentPreview,
      positionMs: clampedPositionMs,
    }))
  }

  const playbackActions = {
    play: () => {
      stopAudioPreview()
      if (countdownSeconds > 0) {
        setCountdownRemaining(countdownSeconds)
        setPlayback((currentPlayback) => ({
          ...currentPlayback,
          isPlaying: false,
        }))
        return
      }

      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        isPlaying: true,
      }))
      syncAudioToTimeline({
        pageIndex: playbackRef.current.activePageIndex,
        pageProgressMs: playbackRef.current.pageProgressMs,
        shouldPlay: true,
        forceSeek: true,
      })
    },
    pause: () => {
      stopAudioPreview()
      setCountdownRemaining(null)
      const pausedPlayback = {
        ...playbackRef.current,
        isPlaying: false,
      }

      playbackRef.current = pausedPlayback
      setPlayback(pausedPlayback)
      syncAudioToTimeline({
        pageIndex: playbackRef.current.activePageIndex,
        pageProgressMs: playbackRef.current.pageProgressMs,
        shouldPlay: false,
      })
    },
    prev: () =>
      {
        stopAudioPreview()
        setCountdownRemaining(null)
        const nextPageIndex = (playbackRef.current.activePageIndex - 1 + pagesRef.current.length) % pagesRef.current.length

        setPlayback((currentPlayback) => ({
          activePageIndex: nextPageIndex,
          isPlaying: false,
          isLooping: currentPlayback.isLooping,
          pageProgressMs: 0,
        }))
        syncAudioToTimeline({
          pageIndex: nextPageIndex,
          pageProgressMs: 0,
          shouldPlay: false,
          forceSeek: true,
        })
      },
    next: () =>
      {
        stopAudioPreview()
        setCountdownRemaining(null)
        const nextPageIndex = (playbackRef.current.activePageIndex + 1) % pagesRef.current.length

        setPlayback((currentPlayback) => ({
          activePageIndex: nextPageIndex,
          isPlaying: false,
          isLooping: currentPlayback.isLooping,
          pageProgressMs: 0,
        }))
        syncAudioToTimeline({
          pageIndex: nextPageIndex,
          pageProgressMs: 0,
          shouldPlay: false,
          forceSeek: true,
        })
      },
    restart: () =>
      {
        resetPlaybackToPage(0, playbackRef.current.isPlaying)
      },
    toggleLoop: () =>
      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        isLooping: !currentPlayback.isLooping,
      })),
    cycleCountdownSeconds: () => {
      setCountdownSeconds((currentValue) => {
        const currentIndex = COUNTDOWN_OPTIONS.indexOf(currentValue)
        const nextIndex = (currentIndex + 1) % COUNTDOWN_OPTIONS.length
        return COUNTDOWN_OPTIONS[nextIndex]
      })
      setCountdownRemaining(null)
      setIsDirty(true)
    },
  }

  const activePage = pages[playback.activePageIndex] ?? pages[0]
  const currentProgressMs = activePage
    ? Math.min(playback.pageProgressMs, activePage.durationMs)
    : playback.pageProgressMs
  const scriptDurationMs = getScriptDurationMs(pages)
  const trimmedAudioDurationMs = audioTrack ? Math.max(0, audioTrack.trimEndMs - audioTrack.trimStartMs) : 0
  const currentPageAudioStartMs = audioTrack
    ? getPageAudioStartMs(audioTrack, pages, playback.activePageIndex)
    : null
  const currentPageAudioInRange = audioTrack
    ? currentPageAudioStartMs !== null && currentPageAudioStartMs < audioTrack.trimEndMs
    : false
  const audioOverflowMs = audioTrack ? Math.max(0, scriptDurationMs - trimmedAudioDurationMs) : 0
  const projectAutosaveKey = JSON.stringify({
    projectName,
    isDirty,
    screenType,
    countdownSeconds,
    pages,
    audioTrack: audioTrack
      ? {
          name: audioTrack.name,
          durationMs: audioTrack.durationMs,
          trimStartMs: audioTrack.trimStartMs,
          trimEndMs: audioTrack.trimEndMs,
          fileSize: audioTrack.sourceFile.size,
          lastModified: audioTrack.sourceFile.lastModified,
        }
      : null,
  })

  return {
    presets: SCREEN_PRESETS,
    screenType,
    preset,
    pages,
    activePage,
    playback,
    projectName,
    isDirty,
    countdownRemaining,
    countdownSeconds,
    projectAutosaveKey,
    audio: {
      track: audioTrack,
      scriptDurationMs,
      trimmedAudioDurationMs,
      currentPageAudioStartMs,
      currentPageAudioInRange,
      hasCoverageGap: audioOverflowMs > 0,
      overflowMs: audioOverflowMs,
      previewPositionMs: audioTrack
        ? clampPreviewPositionMs(audioPreview.positionMs || audioTrack.trimStartMs, audioTrack)
        : 0,
      previewIsPlaying: audioPreview.isPlaying,
    },
    displayRows: activePage ? getVisibleRows(activePage, preset, currentProgressMs) : [],
    editorActions: {
      handleScreenTypeChange,
      handleSelectPage,
      handleAddPage,
      handleDuplicatePage,
      handleDeletePage,
      handleMovePage,
      handlePageModeChange,
      handlePageAnimationChange,
      handlePageTextChange,
      handleRowTextChange,
      handleDurationValueChange,
      handleDurationUnitChange,
    },
    audioActions: {
      importFile: handleImportAudioFile,
      clear: handleClearAudio,
      setTrimStartMs: handleTrimStartChange,
      setTrimEndMs: handleTrimEndChange,
      togglePreviewPlayback: toggleAudioPreviewPlayback,
      seekPreview: seekAudioPreview,
    },
    projectActions: {
      createSnapshot: createProjectSnapshot,
      loadSnapshot: loadProjectSnapshot,
      newProject,
      renameProject,
      saveProject,
      saveProjectAs,
      exportProject,
      importProjectFile,
    },
    playbackActions,
  }
}
