import { LcdControlPanel } from '@/components/lcd-control-panel'
import { LcdPreviewStage } from '@/components/lcd-preview-stage'
import { useLcdStudio } from '@/hooks/use-lcd-studio'
import { useResponsiveEditorDock } from '@/hooks/use-responsive-editor-dock'
import { useViewportMode } from '@/hooks/use-viewport-mode'

function App() {
  const { viewportMode, isMobile } = useViewportMode()
  const { isEditorOpen, toggleEditor } = useResponsiveEditorDock(viewportMode)
  const { presets, screenType, preset, pages, playback, displayRows, editorActions, playbackActions } =
    useLcdStudio()

  const appClassName = [
    'lcd-workspace',
    isEditorOpen ? 'lcd-workspace-editor-open' : 'lcd-workspace-editor-closed',
    isMobile ? 'lcd-workspace-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main className="lcd-app-shell">
      <section className={appClassName}>
        <LcdPreviewStage
          columns={preset.columns}
          rows={preset.rows}
          displayRows={displayRows}
          isEditorOpen={isEditorOpen}
          isLooping={playback.isLooping}
          isPlaying={playback.isPlaying}
          onNext={playbackActions.next}
          onPause={playbackActions.pause}
          onPlay={playbackActions.play}
          onPrev={playbackActions.prev}
          onRestart={playbackActions.restart}
          onToggleEditor={toggleEditor}
          onToggleLoop={playbackActions.toggleLoop}
        />

        <aside className={`lcd-editor-dock${isEditorOpen ? ' lcd-editor-dock-open' : ''}`}>
          <LcdControlPanel
            presets={presets}
            selectedScreenType={screenType}
            columns={preset.columns}
            rows={preset.rows}
            pages={pages}
            activePageIndex={playback.activePageIndex}
            onScreenTypeChange={editorActions.handleScreenTypeChange}
            onSelectPage={editorActions.handleSelectPage}
            onAddPage={editorActions.handleAddPage}
            onDuplicatePage={editorActions.handleDuplicatePage}
            onDeletePage={editorActions.handleDeletePage}
            onMovePage={editorActions.handleMovePage}
            onPageModeChange={editorActions.handlePageModeChange}
            onPageAnimationChange={editorActions.handlePageAnimationChange}
            onPageTextChange={editorActions.handlePageTextChange}
            onRowTextChange={editorActions.handleRowTextChange}
            onDurationValueChange={editorActions.handleDurationValueChange}
            onDurationUnitChange={editorActions.handleDurationUnitChange}
          />
        </aside>
      </section>
    </main>
  )
}

export default App
