import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PROJECT_NAME,
  getDefaultProjectName,
  resolveLoadedProjectName,
} from '@/hooks/lcd-studio-project-name'
import {
  deletePageSelection,
  duplicatePageSelection,
  normalizeSelectedPageIds,
  reorderPageSelection,
  togglePageSelection,
} from '@/lib/editor-page-selection'
import type { PageScript } from '@/types'

function createPage(id: string, text = id): PageScript {
  return {
    id,
    mode: 'page',
    animation: 'replace',
    durationMs: 1000,
    durationUnit: 'ms',
    text,
    rowTexts: ['', ''],
  }
}

describe('use-lcd-studio project naming helpers', () => {
  it('uses a stable untitled name for new projects', () => {
    expect(DEFAULT_PROJECT_NAME).toBe('Untitled')
    expect(getDefaultProjectName()).toBe('Untitled')
    expect(getDefaultProjectName()).toBe('Untitled')
  })

  it('falls back to Untitled when a loaded document has no project name', () => {
    expect(resolveLoadedProjectName('', '')).toBe('Untitled')
    expect(resolveLoadedProjectName(null, undefined)).toBe('Untitled')
  })

  it('prefers the document or file-derived name when available', () => {
    expect(resolveLoadedProjectName('Recovered Draft', 'Import Name')).toBe('Recovered Draft')
    expect(resolveLoadedProjectName('', 'Import Name')).toBe('Import Name')
  })
})

describe('page selection and ordering helpers', () => {
  const rows = 2

  it('toggles page selection in page order for shift-click behavior', () => {
    const pages = [createPage('a'), createPage('b'), createPage('c')]

    expect(togglePageSelection(pages, ['a'], 'c')).toEqual(['a', 'c'])
    expect(togglePageSelection(pages, ['a', 'c'], 'a')).toEqual(['c'])
    expect(togglePageSelection(pages, ['c'], 'b')).toEqual(['b', 'c'])
  })

  it('duplicates the current selection after the selected block and selects the duplicates', () => {
    const pages = [createPage('a'), createPage('b'), createPage('c'), createPage('d')]
    const result = duplicatePageSelection(pages, ['a', 'c'], 'b', rows)

    expect(result.didChange).toBe(true)
    expect(result.nextPages.map((page) => page.id)).toEqual(['a', 'b', 'c', result.nextSelectedPageIds[0], result.nextSelectedPageIds[1], 'd'])
    expect(result.nextPages[3]?.text).toBe('a')
    expect(result.nextPages[4]?.text).toBe('c')
    expect(result.nextSelectedPageIds).toHaveLength(2)
    expect(result.activePageId).toBe(result.nextSelectedPageIds[0])
  })

  it('deletes selected pages, keeps one page minimum, and moves active to the nearest survivor', () => {
    const pages = [createPage('a'), createPage('b'), createPage('c'), createPage('d')]
    const result = deletePageSelection(pages, ['b', 'c'], 'c')

    expect(result.didChange).toBe(true)
    expect(result.nextPages.map((page) => page.id)).toEqual(['a', 'd'])
    expect(result.activePageId).toBe('d')
    expect(result.nextSelectedPageIds).toEqual(['d'])

    const blockedDelete = deletePageSelection([createPage('solo')], ['solo'], 'solo')
    expect(blockedDelete.didChange).toBe(false)
    expect(blockedDelete.nextPages.map((page) => page.id)).toEqual(['solo'])
  })

  it('moves the whole selected group together when dragging a selected page', () => {
    const pages = [createPage('a'), createPage('b'), createPage('c'), createPage('d'), createPage('e')]
    const result = reorderPageSelection(pages, ['b', 'c'], 'c', 'e', 'after', 'b')

    expect(result.didChange).toBe(true)
    expect(result.nextPages.map((page) => page.id)).toEqual(['a', 'd', 'e', 'b', 'c'])
    expect(result.nextSelectedPageIds).toEqual(['b', 'c'])
    expect(result.activePageId).toBe('b')
  })

  it('moves only the dragged page when it was not part of the selection', () => {
    const pages = [createPage('a'), createPage('b'), createPage('c'), createPage('d')]
    const result = reorderPageSelection(pages, ['b', 'c'], 'a', 'd', 'after', 'c')

    expect(result.didChange).toBe(true)
    expect(result.nextPages.map((page) => page.id)).toEqual(['b', 'c', 'd', 'a'])
    expect(result.nextSelectedPageIds).toEqual(['a'])
    expect(result.activePageId).toBe('a')
  })

  it('preserves valid selected ids by page id and falls back when needed', () => {
    const pages = [createPage('a'), createPage('b')]

    expect(normalizeSelectedPageIds(pages, ['missing', 'b'], 'a')).toEqual(['b'])
    expect(normalizeSelectedPageIds(pages, ['missing'], 'a')).toEqual(['a'])
  })
})
