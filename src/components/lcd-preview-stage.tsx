import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Download, FileCog, FolderOpen, Pencil, Plus, Save } from 'lucide-react'

import { LcdAudioPanel } from '@/components/lcd-audio-panel'
import { LcdDisplay } from '@/components/lcd-display'
import { LcdPlaybackBar } from '@/components/lcd-playback-bar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { IconDropdownMenu } from '@/components/ui/icon-dropdown-menu'
import type { ProjectAudioTrack } from '@/lib/lcd'
import {
  isProjectFilePickerAbort,
  openProjectFileWithPicker,
  supportsProjectFileSystemAccess,
  type ProjectFileHandle,
} from '@/lib/project-file-system'
import type { ToastPosition, ToastVariant } from '@/hooks/use-toast'

type AudioActionResult = {
  ok: boolean
  message?: string
  wasClamped?: boolean
}

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
  onNext: () => void
  onPause: () => void
  onPlay: () => void
  onProjectNew: () => Promise<{ ok: boolean; message?: string }> | { ok: boolean; message?: string }
  onProjectRename: (nextProjectName: string) => { ok: boolean; message?: string }
  onProjectSave: () => Promise<{ ok: boolean; message?: string }>
  onProjectSaveAs: (nextProjectName?: string) => Promise<{ ok: boolean; message?: string }>
  onProjectExport: () => Promise<{ ok: boolean; message?: string }>
  onProjectImport: (
    file: File | null,
    options?: { fileHandle?: ProjectFileHandle | null },
  ) => Promise<{ ok: boolean; message?: string }>
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
  onNext,
  onPause,
  onPlay,
  onProjectNew,
  onProjectRename,
  onProjectSave,
  onProjectSaveAs,
  onProjectExport,
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

  const showProjectToast = (result: { ok: boolean; message?: string }) => {
    if (!result.message) {
      return
    }

    onShowToast(result.message, {
      position: 'top-right',
      variant: result.ok ? 'success' : 'error',
    })
  }

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

  const handleProjectNew = async () => {
    const shouldProceed = !isDirty || window.confirm('Discard unsaved changes and create a new project?')

    if (!shouldProceed) {
      return
    }

    const result = await onProjectNew()
    showProjectToast(result)
  }

  const handleProjectSave = async () => {
    const result = await onProjectSave()
    showProjectToast(result)
  }

  const handleProjectSaveAs = async () => {
    const nextProjectName = window.prompt('Save project as', projectName)
    const result = await onProjectSaveAs(nextProjectName ?? undefined)
    showProjectToast(result)
  }

  const handleProjectExport = async () => {
    const result = await onProjectExport()
    showProjectToast(result)
  }

  const handleOpenProjectPicker = async () => {
    if (isDirty && !window.confirm('Discard unsaved changes and open another project?')) {
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
  }

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

  const projectMenuItems = [
    {
      id: 'new-project',
      label: 'New project',
      icon: <Plus />,
      onSelect: handleProjectNew,
    },
    {
      id: 'open-project',
      label: 'Open project',
      icon: <FolderOpen />,
      onSelect: handleOpenProjectPicker,
    },
    {
      id: 'save-project',
      label: 'Save',
      icon: <Save />,
      onSelect: handleProjectSave,
    },
    {
      id: 'save-project-as',
      label: 'Save As',
      icon: <Save />,
      onSelect: handleProjectSaveAs,
    },
    {
      id: 'export-project',
      label: 'Export JSON',
      icon: <Download />,
      onSelect: handleProjectExport,
    },
  ]

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
          onNext={onNext}
          onPause={onPause}
          onPlay={onPlay}
          onPrev={onPrev}
          onRestart={onRestart}
          onToggleAudioPanel={handleToggleAudioDialog}
          onToggleLoop={onToggleLoop}
          onCountdownCycle={onCountdownCycle}
        />

        <Dialog
          open={isAudioPanelOpen}
          onOpenChange={setIsAudioPanelOpen}
          title="MP3 timeline"
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
