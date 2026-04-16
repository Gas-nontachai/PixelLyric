import { useCallback, useEffect } from 'react'

import { LcdControlPanel } from '@/components/lcd-control-panel'
import { LcdPreviewStage } from '@/components/lcd-preview-stage'
import { useLcdStudio } from '@/hooks/use-lcd-studio'
import { useProjectPersistence } from '@/hooks/use-project-persistence'
import { useResponsiveEditorDock } from '@/hooks/use-responsive-editor-dock'
import { useToast } from '@/hooks/use-toast'
import { useViewportMode } from '@/hooks/use-viewport-mode'
import { LcdToastRegion } from '@/components/lcd-toast-region'

function App() {
  const { viewportMode, isMobile } = useViewportMode()
  const { isEditorOpen, toggleEditor } = useResponsiveEditorDock(viewportMode)
  const { showToast, toasts } = useToast()
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

  const isOverlayEditor = viewportMode !== 'desktop'
  const {
    createSnapshot,
    loadSnapshot,
    newProject,
    renameProject,
    saveProject,
    saveProjectAs,
    exportProject,
    importProjectFile,
  } = projectActions

  const appClassName = [
    'lcd-workspace',
    isEditorOpen ? 'lcd-workspace-editor-open' : 'lcd-workspace-editor-closed',
    isMobile ? 'lcd-workspace-mobile' : '',
    isOverlayEditor ? 'lcd-workspace-editor-overlay' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const isPlaybackLocked = playback.isPlaying

  const handleProjectExport = exportProject
  const handleProjectNew = newProject
  const handleProjectRename = renameProject
  const handleProjectSave = saveProject
  const handleProjectSaveAs = saveProjectAs

  const handleProjectImport = importProjectFile

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
    const result = saveAs ? await saveProjectAs(window.prompt('Save project as', projectName) ?? undefined) : await saveProject()

    if (result.message) {
      showToast(result.message, {
        position: 'top-right',
        variant: result.ok ? 'success' : 'error',
      })
    }
  }, [projectName, saveProject, saveProjectAs, showToast])

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
          onNext={playbackActions.next}
          onPause={playbackActions.pause}
          onPlay={playbackActions.play}
          onProjectNew={handleProjectNew}
          onProjectRename={handleProjectRename}
          onProjectSave={handleProjectSave}
          onProjectSaveAs={handleProjectSaveAs}
          onProjectExport={handleProjectExport}
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
      <LcdToastRegion toasts={toasts}  />
    </main>
  )
}

export default App
