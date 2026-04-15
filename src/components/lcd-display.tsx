import { type CSSProperties } from 'react'

import { FONT, type PixelChar } from '@/components/lcd-font'

type LcdDisplayProps = {
  columns: number
  rows: number
  text: string
}

const FALLBACK_CHAR = ' '
const FONT_MAP: Record<string, PixelChar> = FONT

function normalizeLine(line: string, columns: number) {
  return line
    .slice(0, columns)
    .split('')
    .map((char) => (FONT_MAP[char] ? char : FALLBACK_CHAR))
    .join('')
    .padEnd(columns, FALLBACK_CHAR)
}

function buildDisplayRows(text: string, columns: number, rows: number) {
  const rawRows = text.replace(/\r/g, '').split('\n').slice(0, rows)
  const normalizedRows = rawRows.map((row) => normalizeLine(row, columns))

  while (normalizedRows.length < rows) {
    normalizedRows.push(FALLBACK_CHAR.repeat(columns))
  }

  return normalizedRows
}

function LcdCell({ character }: { character: string }) {
  const pixels: PixelChar = FONT_MAP[character] ?? FONT_MAP[FALLBACK_CHAR]

  return (
    <div className="lcd-cell" aria-hidden="true">
      {pixels.map((row, rowIndex) =>
        row.map((pixel, pixelIndex) => (
          <span
            key={`${rowIndex}-${pixelIndex}`}
            className={pixel ? 'lcd-dot lcd-dot-on' : 'lcd-dot lcd-dot-off'}
          />
        )),
      )}
    </div>
  )
}

export function LcdDisplay({ columns, rows, text }: LcdDisplayProps) {
  const lines = buildDisplayRows(text, columns, rows)

  return (
    <section className="lcd-board" aria-label={`LCD display preview ${columns} by ${rows}`}>
      <div className="lcd-screw lcd-screw-top-left" />
      <div className="lcd-screw lcd-screw-top-right" />
      <div className="lcd-screw lcd-screw-bottom-left" />
      <div className="lcd-screw lcd-screw-bottom-right" />

      <div className="lcd-bezel">
        <div className="lcd-screen">
          <div
            className="lcd-characters"
            style={
              {
                '--lcd-columns': columns,
                '--lcd-rows': rows,
              } as CSSProperties
            }
          >
            {lines.map((line, rowIndex) => (
              <div key={rowIndex} className="lcd-row">
                {line.split('').map((character, columnIndex) => (
                  <LcdCell key={`${rowIndex}-${columnIndex}`} character={character} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
