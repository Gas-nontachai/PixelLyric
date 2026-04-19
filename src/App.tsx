import { useCallback, useEffect, useRef } from 'react'

import { LcdControlPanel } from '@/components/lcd-control-panel'
import { LcdDialogRegion } from '@/components/lcd-dialog-region'
import { LcdPreviewStage } from '@/components/lcd-preview-stage'
import { useDialog } from '@/hooks/use-dialog'
import { useLcdStudio } from '@/hooks/use-lcd-studio'
import { downloadTextContentFile } from '@/lib/project-file'
import { useProjectPersistence } from '@/hooks/use-project-persistence'
import { useResponsiveEditorDock } from '@/hooks/use-responsive-editor-dock'
import { useToast } from '@/hooks/use-toast'
import { useViewportMode } from '@/hooks/use-viewport-mode'
import { LcdToastRegion } from '@/components/lcd-toast-region'

function App() {
  const { viewportMode } = useViewportMode()
  const { isEditorOpen, toggleEditor } = useResponsiveEditorDock(viewportMode)
  const { showToast, toasts } = useToast()
  const {
    activeDialog,
    alert,
    confirm,
    confirmActiveDialog,
    dismissActiveDialog,
    exportPreview,
    prompt,
    submitPromptDialog,
  } = useDialog()
  const {
    presets,
    screenType,
    preset,
    pages,
    playback,
    audio,
    projectName,
    isDirty,
    countdownRemaining,
    countdownSeconds,
    displayRows,
    editorActions,
    audioActions,
    projectActions,
    projectAutosaveKey,
    playbackActions,
  } =
    useLcdStudio()
  const hasShownBrowserSaveAlertRef = useRef(false)

  const isOverlayEditor = viewportMode !== 'desktop'
  const {
    createSnapshot,
    loadSnapshot,
    newProject,
    renameProject,
    saveProject,
    saveProjectAs,
    createProjectJsonExportPreview,
    createProjectInoExportPreview,
    importProjectFile,
  } = projectActions

  const appClassName = [
    'lcd-workspace',
    `lcd-workspace-${viewportMode}`,
    isEditorOpen ? 'lcd-workspace-editor-open' : 'lcd-workspace-editor-closed',
    isOverlayEditor ? 'lcd-workspace-editor-overlay' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const isPlaybackLocked = playback.isPlaying

  const handleProjectNew = newProject
  const handleProjectRename = renameProject
  const showBrowserSaveAlert = useCallback(async () => {
    if (hasShownBrowserSaveAlertRef.current) {
      return
    }

    hasShownBrowserSaveAlertRef.current = true

    await alert({
      allowBackdropDismiss: false,
      allowEscapeDismiss: true,
      confirmLabel: 'Continue',
      description: 'Your browser will ask for permission to choose or update the project file before PixelLyric can save it.',
      intent: 'warning',
      showCloseButton: false,
      title: 'Browser permission required',
    })
  }, [alert])

  const handleProjectSave = useCallback(async () => {
    await showBrowserSaveAlert()
    return saveProject()
  }, [saveProject, showBrowserSaveAlert])

  const handleProjectSaveAs = useCallback(async (nextProjectName?: string) => {
    await showBrowserSaveAlert()
    return saveProjectAs(nextProjectName)
  }, [saveProjectAs, showBrowserSaveAlert])

  const handleProjectImport = importProjectFile

  const openExportPreviewDialog = useCallback(async (
    exportType: 'JSON' | 'INO',
    createPreview: typeof createProjectJsonExportPreview,
  ) => {
    try {
      const exportPreviewData = await createPreview()

      void exportPreview({
        copyLabel: 'Copy code',
        downloadLabel: 'Download',
        fileName: exportPreviewData.fileName,
        onCopy: async () => {
          try {
            if (!navigator.clipboard) {
              throw new Error('Clipboard is not available in this browser')
            }

            await navigator.clipboard.writeText(exportPreviewData.content)
            showToast(`${exportType} copied to clipboard`, {
              position: 'top-right',
              variant: 'success',
            })
          } catch (error) {
            showToast(error instanceof Error ? error.message : `Could not copy the ${exportType} export`, {
              position: 'top-right',
              variant: 'error',
            })
          }
        },
        onDownload: async () => {
          try {
            downloadTextContentFile(
              exportPreviewData.content,
              exportPreviewData.fileName,
              exportPreviewData.mimeType,
            )
            showToast(`${exportType} downloaded`, {
              position: 'top-right',
              variant: 'success',
            })
            dismissActiveDialog()
          } catch (error) {
            showToast(error instanceof Error ? error.message : `Could not download the ${exportType} export`, {
              position: 'top-right',
              variant: 'error',
            })
          }
        },
        preview: exportPreviewData.content,
        title: exportPreviewData.fileName,
      })

      return {
        ok: true,
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : `Could not prepare the ${exportType} export`,
      }
    }
  }, [dismissActiveDialog, exportPreview, showToast])

  const handleProjectExportJson = useCallback(async () => {
    return openExportPreviewDialog('JSON', createProjectJsonExportPreview)
  }, [createProjectJsonExportPreview, openExportPreviewDialog])

  const handleProjectExportIno = useCallback(async () => {
    return openExportPreviewDialog('INO', createProjectInoExportPreview)
  }, [createProjectInoExportPreview, openExportPreviewDialog])

  const handleRestoreResult = useCallback(
    (result: { ok: boolean; message?: string }) => {
      if (!result.message) {
        return
      }

      showToast(result.message, {
        position: 'top-right',
        variant: result.ok ? 'success' : 'error',
      })
    },
    [showToast],
  )

  const handleAutosaveError = useCallback(
    (message: string) => {
      showToast(message, {
        position: 'top-right',
        variant: 'error',
      })
    },
    [showToast],
  )

  const handleProjectSaveShortcut = useCallback(async (saveAs = false) => {
    const nextProjectName = saveAs
      ? await prompt({
          confirmLabel: 'Save project',
          defaultValue: projectName,
          description: 'Choose a file name for the exported PixelLyric project.',
          inputLabel: 'Project name',
          inputPlaceholder: 'Untitled',
          title: 'Save project as',
        })
      : null

    if (saveAs && nextProjectName === null) {
      return
    }

    const result = saveAs
      ? await handleProjectSaveAs(nextProjectName ?? undefined)
      : await handleProjectSave()

    if (result.message) {
      showToast(result.message, {
        position: 'top-right',
        variant: result.ok ? 'success' : 'error',
      })
    }
  }, [handleProjectSave, handleProjectSaveAs, projectName, prompt, showToast])

  useProjectPersistence({
    autosaveKey: projectAutosaveKey,
    createSnapshot,
    loadSnapshot,
    onRestoreResult: handleRestoreResult,
    onAutosaveError: handleAutosaveError,
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return
      }

      event.preventDefault()

      if (event.repeat) {
        return
      }

      void handleProjectSaveShortcut(event.shiftKey)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleProjectSaveShortcut])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  return (
    <main className="lcd-app-shell">
      <section className={appClassName}>
        <LcdPreviewStage
          audio={audio}
          columns={preset.columns}
          rows={preset.rows}
          displayRows={displayRows}
          projectName={projectName}
          isDirty={isDirty}
          countdownRemaining={countdownRemaining}
          countdownSeconds={countdownSeconds}
          isEditorOpen={isEditorOpen}
          isLooping={playback.isLooping}
          isPlaybackLocked={isPlaybackLocked}
          isPlaying={playback.isPlaying}
          onAudioClear={audioActions.clear}
          onAudioImport={audioActions.importFile}
          onAudioPreviewSeek={audioActions.seekPreview}
          onAudioPreviewTogglePlay={audioActions.togglePreviewPlayback}
          onAudioTrimEndChange={audioActions.setTrimEndMs}
          onAudioTrimStartChange={audioActions.setTrimStartMs}
          onAudioVolumeChange={audioActions.setVolumePercent}
          onNext={playbackActions.next}
          onPause={playbackActions.pause}
          onPlay={playbackActions.play}
          onProjectConfirm={confirm}
          onProjectNew={handleProjectNew}
          onProjectPrompt={prompt}
          onProjectRename={handleProjectRename}
          onProjectSave={handleProjectSave}
          onProjectSaveAs={handleProjectSaveAs}
          onProjectExportJson={handleProjectExportJson}
          onProjectExportIno={handleProjectExportIno}
          onProjectImport={handleProjectImport}
          onPrev={playbackActions.prev}
          onRestart={playbackActions.restart}
          onShowToast={showToast}
          onToggleEditor={toggleEditor}
          onToggleLoop={playbackActions.toggleLoop}
          onCountdownCycle={playbackActions.cycleCountdownSeconds}
        />

        <aside className={`lcd-editor-dock${isEditorOpen ? ' lcd-editor-dock-open' : ''}`}>
          <LcdControlPanel
            presets={presets}
            selectedScreenType={screenType}
            columns={preset.columns}
            rows={preset.rows}
            pages={pages}
            activePageIndex={playback.activePageIndex}
            isPlaybackLocked={isPlaybackLocked}
            canCloseEditor={isOverlayEditor}
            onCloseEditor={toggleEditor}
            onScreenTypeChange={editorActions.handleScreenTypeChange}
            onSelectPage={editorActions.handleSelectPage}
            onAddPage={editorActions.handleAddPage}
            onDuplicatePage={editorActions.handleDuplicatePage}
            onDeletePage={editorActions.handleDeletePage}
            onPageModeChange={editorActions.handlePageModeChange}
            onPageAnimationChange={editorActions.handlePageAnimationChange}
            onPageTextChange={editorActions.handlePageTextChange}
            onRowTextChange={editorActions.handleRowTextChange}
            onDurationValueChange={editorActions.handleDurationValueChange}
            onDurationUnitChange={editorActions.handleDurationUnitChange}
            onShowToast={showToast}
          />
        </aside>

        {isOverlayEditor && isEditorOpen ? (
          <button
            type="button"
            className="lcd-editor-backdrop"
            aria-label="Close editor"
            onClick={toggleEditor}
          />
        ) : null}
      </section>
      <LcdDialogRegion
        activeDialog={activeDialog}
        onConfirm={confirmActiveDialog}
        onDismiss={dismissActiveDialog}
        onPromptSubmit={submitPromptDialog}
      />
      <LcdToastRegion toasts={toasts}  />
    </main>
  )
}

export default App
