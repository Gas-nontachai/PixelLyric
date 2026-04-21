import { createDuplicatedPage } from '@/lib/lcd'
import type { PageScript } from '@/types'

export type PageSelectionOptions = {
  shiftKey?: boolean
}

export type PageDropPosition = 'before' | 'after'

function getPageIndexById(pages: PageScript[], pageId: string | null | undefined) {
  if (!pageId) {
    return -1
  }

  return pages.findIndex((page) => page.id === pageId)
}

function getOrderedPageIds(pages: PageScript[], pageIds: string[]) {
  const selectedIdSet = new Set(pageIds)

  return pages.filter((page) => selectedIdSet.has(page.id)).map((page) => page.id)
}

function getActionPageIds(pages: PageScript[], selectedPageIds: string[], activePageId: string | null | undefined) {
  const orderedSelectedPageIds = getOrderedPageIds(pages, selectedPageIds)

  if (orderedSelectedPageIds.length > 0) {
    return orderedSelectedPageIds
  }

  if (activePageId && getPageIndexById(pages, activePageId) !== -1) {
    return [activePageId]
  }

  return pages[0] ? [pages[0].id] : []
}

export function normalizeSelectedPageIds(
  pages: PageScript[],
  selectedPageIds: string[],
  fallbackPageId?: string | null,
) {
  const orderedSelectedPageIds = getOrderedPageIds(pages, selectedPageIds)

  if (orderedSelectedPageIds.length > 0) {
    return orderedSelectedPageIds
  }

  if (fallbackPageId && getPageIndexById(pages, fallbackPageId) !== -1) {
    return [fallbackPageId]
  }

  return []
}

export function togglePageSelection(
  pages: PageScript[],
  selectedPageIds: string[],
  pageId: string,
) {
  const nextSelectedPageIds = selectedPageIds.includes(pageId)
    ? selectedPageIds.filter((selectedPageId) => selectedPageId !== pageId)
    : [...selectedPageIds, pageId]

  return getOrderedPageIds(pages, nextSelectedPageIds)
}

export function duplicatePageSelection(
  pages: PageScript[],
  selectedPageIds: string[],
  activePageId: string | null | undefined,
  rows: number,
) {
  const targetPageIds = getActionPageIds(pages, selectedPageIds, activePageId)

  if (targetPageIds.length === 0) {
    return {
      activePageId: activePageId ?? null,
      didChange: false,
      nextPages: pages,
      nextSelectedPageIds: selectedPageIds,
    }
  }

  const targetIdSet = new Set(targetPageIds)
  const insertionIndex = pages.reduce((maxIndex, page, pageIndex) => (
    targetIdSet.has(page.id) ? pageIndex : maxIndex
  ), -1) + 1
  const duplicatedPages = pages
    .filter((page) => targetIdSet.has(page.id))
    .map((page) => createDuplicatedPage(page, rows))

  if (duplicatedPages.length === 0) {
    return {
      activePageId: activePageId ?? null,
      didChange: false,
      nextPages: pages,
      nextSelectedPageIds: selectedPageIds,
    }
  }

  return {
    activePageId: duplicatedPages[0]?.id ?? null,
    didChange: true,
    nextPages: [
      ...pages.slice(0, insertionIndex),
      ...duplicatedPages,
      ...pages.slice(insertionIndex),
    ],
    nextSelectedPageIds: duplicatedPages.map((page) => page.id),
  }
}

export function deletePageSelection(
  pages: PageScript[],
  selectedPageIds: string[],
  activePageId: string | null | undefined,
) {
  const targetPageIds = getActionPageIds(pages, selectedPageIds, activePageId)

  if (targetPageIds.length === 0 || targetPageIds.length >= pages.length) {
    return {
      activePageId: activePageId ?? pages[0]?.id ?? null,
      didChange: false,
      nextPages: pages,
      nextSelectedPageIds: selectedPageIds,
    }
  }

  const targetIdSet = new Set(targetPageIds)
  const nextPages = pages.filter((page) => !targetIdSet.has(page.id))

  if (nextPages.length === 0) {
    return {
      activePageId: activePageId ?? null,
      didChange: false,
      nextPages: pages,
      nextSelectedPageIds: selectedPageIds,
    }
  }

  let nextActivePageId = activePageId ?? null

  if (!nextActivePageId || targetIdSet.has(nextActivePageId)) {
    const pageIndexById = new Map(pages.map((page, pageIndex) => [page.id, pageIndex]))
    const activePageIndex = getPageIndexById(pages, activePageId)
    const anchorPageIndex = targetPageIds.reduce((nearestIndex, pageId) => {
      const pageIndex = pageIndexById.get(pageId) ?? 0

      if (activePageIndex !== -1 && pageId === activePageId) {
        return activePageIndex
      }

      if (activePageIndex === -1) {
        return Math.min(nearestIndex, pageIndex)
      }

      return Math.abs(pageIndex - activePageIndex) < Math.abs(nearestIndex - activePageIndex)
        ? pageIndex
        : nearestIndex
    }, activePageIndex === -1 ? Number.POSITIVE_INFINITY : activePageIndex)

    nextActivePageId = nextPages.reduce((bestPageId, page) => {
      if (!bestPageId) {
        return page.id
      }

      const bestIndex = pageIndexById.get(bestPageId) ?? 0
      const pageIndex = pageIndexById.get(page.id) ?? 0
      const bestDistance = Math.abs(bestIndex - anchorPageIndex)
      const pageDistance = Math.abs(pageIndex - anchorPageIndex)

      if (pageDistance < bestDistance) {
        return page.id
      }

      if (pageDistance === bestDistance && pageIndex < bestIndex) {
        return page.id
      }

      return bestPageId
    }, nextPages[0]?.id ?? null)
  }

  return {
    activePageId: nextActivePageId,
    didChange: true,
    nextPages,
    nextSelectedPageIds: normalizeSelectedPageIds(nextPages, nextActivePageId ? [nextActivePageId] : []),
  }
}

export function reorderPageSelection(
  pages: PageScript[],
  selectedPageIds: string[],
  draggedPageId: string,
  targetPageId: string,
  dropPosition: PageDropPosition,
  activePageId: string | null | undefined,
) {
  const orderedSelectedPageIds = getOrderedPageIds(pages, selectedPageIds)
  const draggedPageIsSelected = orderedSelectedPageIds.includes(draggedPageId)
  const movingPageIds = draggedPageIsSelected ? orderedSelectedPageIds : [draggedPageId]
  const movingPageIdSet = new Set(movingPageIds)

  if (movingPageIdSet.has(targetPageId)) {
    return {
      activePageId: activePageId ?? null,
      didChange: false,
      nextPages: pages,
      nextSelectedPageIds: selectedPageIds,
    }
  }

  const movingPages = pages.filter((page) => movingPageIdSet.has(page.id))
  const remainingPages = pages.filter((page) => !movingPageIdSet.has(page.id))
  const targetPageIndex = remainingPages.findIndex((page) => page.id === targetPageId)

  if (movingPages.length === 0 || targetPageIndex === -1) {
    return {
      activePageId: activePageId ?? null,
      didChange: false,
      nextPages: pages,
      nextSelectedPageIds: selectedPageIds,
    }
  }

  const insertionIndex = dropPosition === 'before' ? targetPageIndex : targetPageIndex + 1
  const nextPages = [
    ...remainingPages.slice(0, insertionIndex),
    ...movingPages,
    ...remainingPages.slice(insertionIndex),
  ]
  const didChange = nextPages.some((page, pageIndex) => page !== pages[pageIndex])
  const nextSelectedPageIds = draggedPageIsSelected
    ? movingPages.map((page) => page.id)
    : [draggedPageId]
  const nextActivePageId = draggedPageIsSelected ? (activePageId ?? movingPages[0]?.id ?? null) : draggedPageId

  return {
    activePageId: nextActivePageId,
    didChange,
    nextPages,
    nextSelectedPageIds,
  }
}
