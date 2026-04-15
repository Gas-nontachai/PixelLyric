import { type ChangeEvent } from 'react'

import { LCD_TEXT_PLACEHOLDER, type ScreenPreset, type ScreenPresetId } from '@/lib/lcd'

type LcdControlPanelProps = {
  presets: ScreenPreset[]
  selectedScreenType: ScreenPresetId
  columns: number
  rows: number
  text: string
  textMaxLength: number
  onScreenTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
}

export function LcdControlPanel({
  presets,
  selectedScreenType,
  columns,
  rows,
  text,
  textMaxLength,
  onScreenTypeChange,
  onTextChange,
}: LcdControlPanelProps) {
  return (
    <div className="lcd-panel">
      <div className="lcd-panel-heading">
        <h1>PixelLyric</h1>
      </div>

      <label className="lcd-field">
        <span>Screen size</span>
        <select value={selectedScreenType} onChange={onScreenTypeChange}>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className="lcd-field">
        <div className="lcd-field-row">
          <span>Text input</span>
          <small>
            {columns} columns x {rows} rows
          </small>
        </div>
        <textarea
          rows={rows}
          maxLength={textMaxLength}
          value={text}
          onChange={onTextChange}
          placeholder={LCD_TEXT_PLACEHOLDER}
          spellCheck={false}
        />
      </label>
    </div>
  )
}
