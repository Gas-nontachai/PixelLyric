import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PROJECT_NAME,
  getDefaultProjectName,
  resolveLoadedProjectName,
} from '@/hooks/lcd-studio-project-name'

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
