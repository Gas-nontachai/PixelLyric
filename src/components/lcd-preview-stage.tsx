import { type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { FileCog, Pencil } from 'lucide-react'

import { LcdAudioPanel } from '@/components/lcd-audio-panel'
import { LcdDisplay } from '@/components/lcd-display'
import { LcdPlaybackBar } from '@/components/lcd-playback-bar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { IconDropdownMenu } from '@/components/ui/icon-dropdown-menu'
import { PROJECT_MENU_ITEMS } from '@/configs/project-menu'
import {
  isProjectFilePickerAbort,
  openProjectFileWithPicker,
  supportsProjectFileSystemAccess,
} from '@/lib/project-file-system'
import type {
  AudioActionResult,
  ConfirmDialogOptions,
  PromptDialogOptions,
  ProjectActionResult,
  ProjectAudioTrack,
  ProjectFileHandle,
  ToastPosition,
  ToastVariant,
} from '@/types'

type PreviewAudioState = {
  track: ProjectAudioTrack | null
  scriptDurationMs: number
  trimmedAudioDurationMs: number
  currentPageAudioStartMs: number | null
  currentPageAudioInRange: boolean
  hasCoverageGap: boolean
  overflowMs: number
  previewPositionMs: number
  previewIsPlaying: boolean
  volumePercent: number
}

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName

  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

type LcdPreviewStageProps = {
  audio: PreviewAudioState
  columns: number
  countdownRemaining: number | null
  countdownSeconds: 0 | 3 | 5 | 10
  rows: number
  displayRows: string[]
  projectName: string
  isDirty: boolean
  isEditorOpen: boolean
  isLooping: boolean
  isPlaybackLocked: boolean
  isPlaying: boolean
  onAudioClear: () => void
  onAudioImport: (file: File | null) => Promise<AudioActionResult>
  onAudioPreviewSeek: (value: number) => void
  onAudioPreviewTogglePlay: () => void
  onAudioTrimEndChange: (value: number) => AudioActionResult
  onAudioTrimStartChange: (value: number) => AudioActionResult
  onAudioVolumeChange: (value: number) => AudioActionResult
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onProjectConfirm: (options: ConfirmDialogOptions) => Promise<boolean>
  onProjectNew: () => Promise<ProjectActionResult> | ProjectActionResult
  onProjectPrompt: (options: PromptDialogOptions) => Promise<string | null>
  onProjectRename: (nextProjectName: string) => ProjectActionResult
  onProjectSave: () => Promise<ProjectActionResult>
  onProjectSaveAs: (nextProjectName?: string) => Promise<ProjectActionResult>
  onProjectExportJson: () => Promise<ProjectActionResult>
  onProjectExportIno: () => Promise<ProjectActionResult>
  onProjectImport: (
    file: File | null,
    options?: { fileHandle?: ProjectFileHandle | null },
  ) => Promise<ProjectActionResult>
  onPrev: () => void
  onRestart: () => void
  onShowToast: (
    message: string,
    options?: { position?: ToastPosition; variant?: ToastVariant },
  ) => void
  onToggleEditor: () => void
  onToggleLoop: () => void
  onCountdownCycle: () => void
}

export function LcdPreviewStage({
  audio,
  columns,
  countdownRemaining,
  countdownSeconds,
  rows,
  displayRows,
  projectName,
  isDirty,
  isEditorOpen,
  isLooping,
  isPlaybackLocked,
  isPlaying,
  onAudioClear,
  onAudioImport,
  onAudioPreviewSeek,
  onAudioPreviewTogglePlay,
  onAudioTrimEndChange,
  onAudioTrimStartChange,
  onAudioVolumeChange,
  onNext,
  onPause,
  onPlay,
  onProjectConfirm,
  onProjectNew,
  onProjectPrompt,
  onProjectRename,
  onProjectSave,
  onProjectSaveAs,
  onProjectExportJson,
  onProjectExportIno,
  onProjectImport,
  onPrev,
  onRestart,
  onShowToast,
  onToggleEditor,
  onToggleLoop,
  onCountdownCycle,
}: LcdPreviewStageProps) {
  const [isAudioPanelOpen, setIsAudioPanelOpen] = useState(false)
  const [isRenamingProjectName, setIsRenamingProjectName] = useState(false)
  const [projectNameDraft, setProjectNameDraft] = useState(projectName)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const projectFileInputRef = useRef<HTMLInputElement | null>(null)
  const projectNameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isRenamingProjectName) {
      return
    }

    projectNameInputRef.current?.focus()
    projectNameInputRef.current?.select()
  }, [isRenamingProjectName])

  const showProjectToast = useCallback((result: ProjectActionResult) => {
    if (!result.message) {
      return
    }

    onShowToast(result.message, {
      position: 'top-right',
      variant: result.ok ? 'success' : 'error',
    })
  }, [onShowToast])

  const handleAudioFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (isPlaybackLocked) {
      event.target.value = ''
      return
    }

    const [file] = Array.from(event.target.files ?? [])
    const result = await onAudioImport(file ?? null)

    if (!result.ok && result.message) {
      onShowToast(result.message, {
        position: 'top-right',
        variant: 'error',
      })
    }

    if (result.ok) {
      setIsAudioPanelOpen(true)
      onShowToast('MP3 imported', {
        position: 'top-right',
        variant: 'success',
      })
    }

    event.target.value = ''
  }

  const handleToggleAudioDialog = () => {
    if (isPlaybackLocked) {
      return
    }

    if (!audio.track) {
      fileInputRef.current?.click()
      return
    }

    setIsAudioPanelOpen((currentValue) => !currentValue)
  }

  const handleProjectFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (isPlaybackLocked) {
      event.target.value = ''
      return
    }

    const [file] = Array.from(event.target.files ?? [])
    const result = await onProjectImport(file ?? null)

    showProjectToast(result)

    event.target.value = ''
  }

  const handleProjectNew = useCallback(async () => {
    const shouldProceed = !isDirty || await onProjectConfirm({
      confirmLabel: 'Discard changes',
      description: 'Your current project has unsaved changes. Starting a new project will remove them.',
      intent: 'warning',
      title: 'Create a new project?',
    })

    if (!shouldProceed) {
      return
    }

    const result = await onProjectNew()
    showProjectToast(result)
  }, [isDirty, onProjectConfirm, onProjectNew, showProjectToast])

  const handleProjectSave = useCallback(async () => {
    const result = await onProjectSave()
    showProjectToast(result)
  }, [onProjectSave, showProjectToast])

  const handleProjectSaveAs = useCallback(async () => {
    const nextProjectName = await onProjectPrompt({
      confirmLabel: 'Save project',
      defaultValue: projectName,
      description: 'Choose a file name for the exported PixelLyric project.',
      inputLabel: 'Project name',
      inputPlaceholder: 'Untitled',
      title: 'Save project as',
    })

    if (nextProjectName === null) {
      return
    }

    const result = await onProjectSaveAs(nextProjectName ?? undefined)
    showProjectToast(result)
  }, [onProjectPrompt, onProjectSaveAs, projectName, showProjectToast])

  const handleProjectExportJson = useCallback(async () => {
    const result = await onProjectExportJson()
    showProjectToast(result)
  }, [onProjectExportJson, showProjectToast])

  const handleProjectExportIno = useCallback(async () => {
    const result = await onProjectExportIno()
    showProjectToast(result)
  }, [onProjectExportIno, showProjectToast])

  const handleOpenProjectPicker = useCallback(async () => {
    if (isDirty && !await onProjectConfirm({
      confirmLabel: 'Discard changes',
      description: 'Opening another project will replace the current unsaved project in the studio.',
      intent: 'warning',
      title: 'Open another project?',
    })) {
      return
    }

    if (supportsProjectFileSystemAccess()) {
      try {
        const pickedProject = await openProjectFileWithPicker()

        if (!pickedProject) {
          return
        }

        const result = await onProjectImport(pickedProject.file, {
          fileHandle: pickedProject.fileHandle,
        })

        showProjectToast(result)
        return
      } catch (error) {
        if (isProjectFilePickerAbort(error)) {
          return
        }

        showProjectToast({
          ok: false,
          message: error instanceof Error ? error.message : 'Could not open the project',
        })
        return
      }
    }

    projectFileInputRef.current?.click()
  }, [isDirty, onProjectConfirm, onProjectImport, showProjectToast])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        isPlaybackLocked ||
        event.repeat ||
        event.isComposing ||
        !(event.metaKey || event.ctrlKey) ||
        !event.altKey
      ) {
        return
      }

      if (isEditableEventTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'n') {
        event.preventDefault()
        void handleProjectNew()
        return
      }

      if (key === 'o') {
        event.preventDefault()
        void handleOpenProjectPicker()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleOpenProjectPicker, handleProjectNew, isPlaybackLocked])

  const handleStartProjectRename = () => {
    if (isPlaybackLocked) {
      return
    }

    setProjectNameDraft(projectName)
    setIsRenamingProjectName(true)
  }

  const handleProjectNameInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const result = onProjectRename(projectNameDraft)
      setIsRenamingProjectName(false)
      showProjectToast(result)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setProjectNameDraft(projectName)
      setIsRenamingProjectName(false)
    }
  }

  const handleProjectNameBlur = () => {
    const result = onProjectRename(projectNameDraft)
    setIsRenamingProjectName(false)
    showProjectToast(result)
  }

  const getProjectMenuAction = useCallback((itemId: string) => {
    switch (itemId) {
      case 'new-project':
        return handleProjectNew
      case 'open-project':
        return handleOpenProjectPicker
      case 'save-project':
        return handleProjectSave
      case 'save-project-as':
        return handleProjectSaveAs
      case 'export-project':
        return () => undefined
      case 'export-project-json':
        return handleProjectExportJson
      case 'export-project-ino':
        return handleProjectExportIno
      default:
        return () => undefined
    }
  }, [
    handleOpenProjectPicker,
    handleProjectExportIno,
    handleProjectExportJson,
    handleProjectNew,
    handleProjectSave,
    handleProjectSaveAs,
  ])

  const projectMenuItems = PROJECT_MENU_ITEMS.map((item) => {
    if ('children' in item) {
      return {
        ...item,
        onSelect: getProjectMenuAction(item.id),
        children: item.children.map((childItem) => ({
          ...childItem,
          onSelect: getProjectMenuAction(childItem.id),
        })),
      }
    }

    return {
      ...item,
      onSelect: getProjectMenuAction(item.id),
    }
  })

  return (
    <section className="lcd-preview-panel">
      <div className="lcd-preview-shell">
        <input
          ref={projectFileInputRef}
          className="lcd-audio-file-input"
          type="file"
          accept=".pixelyric,application/json"
          onChange={handleProjectFileChange}
        />

        <input
          ref={fileInputRef}
          className="lcd-audio-file-input"
          type="file"
          accept=".mp3,audio/mpeg"
          onChange={handleAudioFileChange}
        />

        <div className="lcd-preview-header">
          <div className="lcd-preview-title-block">
            <h1>PixelLyric</h1>
            <div className="lcd-project-name-row">
              {isRenamingProjectName ? (
                <input
                  ref={projectNameInputRef}
                  className="lcd-project-name-input"
                  value={projectNameDraft}
                  onChange={(event) => setProjectNameDraft(event.target.value)}
                  onBlur={handleProjectNameBlur}
                  onKeyDown={handleProjectNameInputKeyDown}
                  aria-label="Project name"
                />
              ) : (
                <button
                  type="button"
                  className="lcd-project-name-button"
                  onDoubleClick={handleStartProjectRename}
                  aria-label="Rename project"
                  title="Double-click to rename"
                >
                  <span className="lcd-project-name-text">{projectName}</span>
                  {isDirty ? <span className="lcd-project-name-dirty">*</span> : null}
                  <span className="lcd-project-name-hover-hint">Double-click to rename</span>
                </button>
              )}
            </div>
          </div>
          <div className="lcd-preview-header-actions">
            <IconDropdownMenu
              ariaLabel="Project actions"
              disabled={isPlaybackLocked}
              items={projectMenuItems}
              menuLabel="Project actions"
              triggerIcon={<FileCog />}
            />
            <Button
              size="icon"
              variant="outline"
              className="lcd-toggle-button"
              onClick={onToggleEditor}
              aria-label={isEditorOpen ? 'Hide editor' : 'Show editor'}
              disabled={isPlaybackLocked}
            >
              <Pencil />
            </Button>
          </div>
        </div>

        <div className="lcd-preview-board-wrap">
          {countdownRemaining !== null ? (
            <div className="lcd-countdown-overlay">{countdownRemaining}</div>
          ) : null}
          <LcdDisplay columns={columns} rows={rows} displayRows={displayRows} />
        </div>

        <div className="flex justify-center">
          {audio.track ? (
            <>
              <span className="lcd-audio-tab-title">
                Now Playing:
                <span className="lcd-audio-tab-value">
                  {audio.track.name}
                </span>
              </span>
            </>
          ) : null}
        </div>

        <LcdPlaybackBar
          countdownRemaining={countdownRemaining}
          countdownSeconds={countdownSeconds}
          hasAudio={Boolean(audio.track)}
          isAudioPanelOpen={isAudioPanelOpen}
          isLooping={isLooping}
          isPlaybackLocked={isPlaybackLocked}
          isPlaying={isPlaying}
          volumePercent={audio.volumePercent}
          onNext={onNext}
          onPause={onPause}
          onPlay={onPlay}
          onPrev={onPrev}
          onRestart={onRestart}
          onToggleAudioPanel={handleToggleAudioDialog}
          onToggleLoop={onToggleLoop}
          onCountdownCycle={onCountdownCycle}
          onVolumeChange={(value) => {
            onAudioVolumeChange(value)
          }}
        />

        <Dialog
          open={isAudioPanelOpen}
          onOpenChange={setIsAudioPanelOpen}
          title="Audio tools"
        >
          <LcdAudioPanel
            audio={audio}
            isPlaybackLocked={isPlaybackLocked}
            onImportFile={onAudioImport}
            onPreviewSeek={onAudioPreviewSeek}
            onPreviewTogglePlay={onAudioPreviewTogglePlay}
            onClear={onAudioClear}
            onTrimStartMsChange={onAudioTrimStartChange}
            onTrimEndMsChange={onAudioTrimEndChange}
            onShowToast={onShowToast}
          />
        </Dialog>
      </div>
    </section>
  )
}
