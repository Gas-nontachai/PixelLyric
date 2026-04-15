import { type ChangeEvent, useState } from 'react'

import { LcdControlPanel } from '@/components/lcd-control-panel'
import { LcdDisplay } from '@/components/lcd-display'
import {
  DEFAULT_TEXT,
  SCREEN_PRESETS,
  autoWrapTextareaValue,
  getPresetById,
  type ScreenPresetId,
} from '@/lib/lcd'

function App() {
  const [screenType, setScreenType] = useState<ScreenPresetId>('16x2')
  const [text, setText] = useState(DEFAULT_TEXT)

  const preset = getPresetById(screenType)
  const capacity = preset.columns * preset.rows
  const textMaxLength = capacity + (preset.rows - 1)

  const handleScreenTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextScreenType = event.target.value as ScreenPresetId
    const nextPreset = getPresetById(nextScreenType)

    setScreenType(nextScreenType)
    setText((currentText) =>
      autoWrapTextareaValue(currentText, nextPreset.columns, nextPreset.rows),
    )
  }

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(autoWrapTextareaValue(event.target.value, preset.columns, preset.rows))
  }

  return (
    <main className="lcd-app-shell">
      <section className="lcd-layout">
        <LcdControlPanel
          presets={SCREEN_PRESETS}
          selectedScreenType={screenType}
          columns={preset.columns}
          rows={preset.rows}
          text={text}
          textMaxLength={textMaxLength}
          onScreenTypeChange={handleScreenTypeChange}
          onTextChange={handleTextChange}
        />

        <div className="lcd-preview-panel">
          <LcdDisplay columns={preset.columns} rows={preset.rows} text={text} />
        </div>
      </section>
    </main>
  )
}

export default App
