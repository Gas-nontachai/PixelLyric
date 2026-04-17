import { useEffect, useRef, useState } from 'react'

import { loadAutosavedProject, saveAutosavedProject } from '@/lib/project-storage'
import type { PixelLyricProjectDocument, ProjectActionResult } from '@/types'

type UseProjectPersistenceOptions = {
  autosaveKey: string
  createSnapshot: () => Promise<PixelLyricProjectDocument>
  loadSnapshot: (
    document: PixelLyricProjectDocument,
    options?: { source?: 'autosave' | 'file' },
  ) => Promise<ProjectActionResult>
  onRestoreResult?: (result: ProjectActionResult) => void
  onAutosaveError?: (message: string) => void
}

const AUTOSAVE_DELAY_MS = 900

export function useProjectPersistence({
  autosaveKey,
  createSnapshot,
  loadSnapshot,
  onRestoreResult,
  onAutosaveError,
}: UseProjectPersistenceOptions) {
  const [isReady, setIsReady] = useState(false)
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    let isCancelled = false

    const restoreAutosave = async () => {
      try {
        const autosavedProject = await loadAutosavedProject()

        if (!autosavedProject) {
          if (!isCancelled) {
            hasRestoredRef.current = true
            setIsReady(true)
          }

          return
        }

        const result = await loadSnapshot(autosavedProject, { source: 'autosave' })

        if (!isCancelled) {
          hasRestoredRef.current = true
          setIsReady(true)
          onRestoreResult?.(
            result.ok
              ? { ok: true, message: 'Autosaved project restored' }
              : result,
          )
        }
      } catch {
        if (!isCancelled) {
          hasRestoredRef.current = true
          setIsReady(true)
          onRestoreResult?.({
            ok: false,
            message: 'Could not restore the autosaved project',
          })
        }
      }
    }

    void restoreAutosave()

    return () => {
      isCancelled = true
    }
  }, [loadSnapshot, onRestoreResult])

  useEffect(() => {
    if (!isReady || !hasRestoredRef.current) {
      return
    }

    let isCancelled = false
    const timeoutId = window.setTimeout(() => {
      void createSnapshot()
        .then((snapshot) => {
          if (isCancelled) {
            return
          }

          return saveAutosavedProject(snapshot)
        })
        .catch(() => {
          if (!isCancelled) {
            onAutosaveError?.('Could not autosave the current project')
          }
        })
    }, AUTOSAVE_DELAY_MS)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [autosaveKey, createSnapshot, isReady, onAutosaveError])

  return {
    isReady,
  }
}