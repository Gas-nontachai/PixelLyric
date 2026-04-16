import { LcdControlPanel } from '@/components/lcd-control-panel'
import { LcdPreviewStage } from '@/components/lcd-preview-stage'
import { useLcdStudio } from '@/hooks/use-lcd-studio'
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
    countdownRemaining,
    countdownSeconds,
    displayRows,
    editorActions,
    audioActions,
    playbackActions,
  } =
    useLcdStudio()

  const isOverlayEditor = viewportMode !== 'desktop'

  const appClassName = [
    'lcd-workspace',
    isEditorOpen ? 'lcd-workspace-editor-open' : 'lcd-workspace-editor-closed',
    isMobile ? 'lcd-workspace-mobile' : '',
    isOverlayEditor ? 'lcd-workspace-editor-overlay' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const isPlaybackLocked = playback.isPlaying

  return (
    <main className="lcd-app-shell">
      <section className={appClassName}>
        <LcdPreviewStage
          audio={audio}
          columns={preset.columns}
          rows={preset.rows}
          displayRows={displayRows}
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
