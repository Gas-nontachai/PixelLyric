import { type ChangeEvent, useEffect, useRef, useState } from 'react'

import {
  DEFAULT_DURATION_MS,
  SCREEN_PRESETS,
  createBlankPage,
  createDuplicatedPage,
  createInitialPage,
  getPresetById,
  getVisibleRows,
  normalizePageText,
  normalizeRowTexts,
  parseDurationInput,
  type DurationUnit,
  type LcdAnimation,
  type PageMode,
  type PageScript,
  type ScreenPresetId,
} from '@/lib/lcd'

type PlaybackState = {
  activePageIndex: number
  isPlaying: boolean
  isLooping: boolean
  pageProgressMs: number
}

type CountdownOption = 0 | 3 | 5 | 10
const COUNTDOWN_OPTIONS: CountdownOption[] = [0, 3, 5, 10]

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

export function useLcdStudio() {
  const [screenType, setScreenType] = useState<ScreenPresetId>('16x2')
  const preset = getPresetById(screenType)
  const [pages, setPages] = useState<PageScript[]>(() => [createInitialPage(preset.rows)])
  const [playback, setPlayback] = useState<PlaybackState>({
    activePageIndex: 0,
    isPlaying: false,
    isLooping: true,
    pageProgressMs: 0,
  })
  const [countdownSeconds, setCountdownSeconds] = useState<CountdownOption>(0)
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null)

  const playbackRef = useRef(playback)
  const pagesRef = useRef(pages)

  useEffect(() => {
    playbackRef.current = playback
  }, [playback])

  useEffect(() => {
    pagesRef.current = pages
  }, [pages])

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

      while (latestPages[nextPageIndex] && nextProgressMs >= latestPages[nextPageIndex].durationMs) {
        if (!latestPlayback.isLooping && nextPageIndex === latestPages.length - 1) {
          nextProgressMs = latestPages[nextPageIndex].durationMs
          shouldStop = true
          break
        }

        nextProgressMs -= latestPages[nextPageIndex].durationMs
        nextPageIndex = (nextPageIndex + 1) % latestPages.length
      }

      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        activePageIndex: nextPageIndex,
        isPlaying: shouldStop ? false : currentPlayback.isPlaying,
        pageProgressMs: nextProgressMs,
      }))

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [playback.isPlaying])

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

  const resetPlaybackToPage = (pageIndex: number, shouldPlay = false) => {
    setCountdownRemaining(null)
    setPlayback((currentPlayback) => ({
      ...currentPlayback,
      activePageIndex: pageIndex,
      isPlaying: shouldPlay,
      pageProgressMs: 0,
    }))
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
  }

  const handleSelectPage = (pageIndex: number) => {
    resetPlaybackToPage(pageIndex, false)
  }

  const handleAddPage = () => {
    const nextPage = createBlankPage(preset.rows)

    setPages((currentPages) => [...currentPages, nextPage])
    resetPlaybackToPage(pages.length, false)
  }

  const handleDuplicatePage = (pageIndex: number) => {
    setPages((currentPages) => {
      const duplicatedPage = createDuplicatedPage(currentPages[pageIndex], preset.rows)
      const nextPages = [...currentPages]
      nextPages.splice(pageIndex + 1, 0, duplicatedPage)
      return nextPages
    })

    resetPlaybackToPage(pageIndex + 1, false)
  }

  const handleDeletePage = (pageIndex: number) => {
    if (pages.length === 1) {
      return
    }

    setPages((currentPages) => currentPages.filter((_, index) => index !== pageIndex))
    resetPlaybackToPage(Math.max(0, pageIndex - 1), false)
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
  }

  const handlePageAnimationChange = (pageIndex: number, animation: LcdAnimation) => {
    updatePage(pageIndex, (page) => ({ ...page, animation }))
    resetPlaybackToPage(pageIndex, false)
  }

  const handlePageTextChange = (pageIndex: number, event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = normalizePageText(event.target.value, preset.columns, preset.rows)
    updatePage(pageIndex, (page) => ({ ...page, text: nextText }))
  }

  const handleRowTextChange = (pageIndex: number, rowIndex: number, value: string) => {
    updatePage(pageIndex, (page) => ({
      ...page,
      rowTexts: normalizeRowTexts(page.rowTexts, preset.rows).map((rowText, index) =>
        index === rowIndex ? value : rowText,
      ),
    }))
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
  }

  const playbackActions = {
    play: () => {
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
    },
    pause: () => {
      setCountdownRemaining(null)
      setPlayback((currentPlayback) => ({
        ...currentPlayback,
        isPlaying: false,
      }))
    },
    prev: () =>
      {
        setCountdownRemaining(null)
        setPlayback((currentPlayback) => ({
          activePageIndex:
            (currentPlayback.activePageIndex - 1 + pages.length) % pages.length,
          isPlaying: false,
          isLooping: currentPlayback.isLooping,
          pageProgressMs: 0,
        }))
      },
    next: () =>
      {
        setCountdownRemaining(null)
        setPlayback((currentPlayback) => ({
          activePageIndex: (currentPlayback.activePageIndex + 1) % pages.length,
          isPlaying: false,
          isLooping: currentPlayback.isLooping,
          pageProgressMs: 0,
        }))
      },
    restart: () =>
      {
        setCountdownRemaining(null)
        setPlayback((currentPlayback) => ({
          ...currentPlayback,
          pageProgressMs: 0,
        }))
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
    },
  }

  const activePage = pages[playback.activePageIndex] ?? pages[0]
  const currentProgressMs = activePage
    ? Math.min(playback.pageProgressMs, activePage.durationMs)
    : playback.pageProgressMs

  return {
    presets: SCREEN_PRESETS,
    screenType,
    preset,
    pages,
    activePage,
    playback,
    countdownRemaining,
    countdownSeconds,
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
    playbackActions,
  }
}
