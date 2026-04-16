import { memo, type CSSProperties } from 'react'

import { FONT, type PixelChar } from '@/components/lcd-font'

type LcdDisplayProps = {
  columns: number
  rows: number
  displayRows: string[]
}

const FALLBACK_CHAR = ' '
const FONT_MAP: Record<string, PixelChar> = FONT
const CELL_WIDTH = 28
const CELL_HEIGHT = 44
const CELL_PADDING_X = 3
const CELL_PADDING_Y = 3
const DOT_WIDTH = 3.6
const DOT_HEIGHT = 3.875
const DOT_GAP_X = 1
const DOT_GAP_Y = 1
function createGlyphDataUri(pixels: PixelChar) {
  const circles: string[] = []

  for (let rowIndex = 0; rowIndex < pixels.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < pixels[rowIndex].length; columnIndex += 1) {
      const isOn = pixels[rowIndex][columnIndex] === 1
      const x = CELL_PADDING_X + columnIndex * (DOT_WIDTH + DOT_GAP_X) + DOT_WIDTH / 2
      const y = CELL_PADDING_Y + rowIndex * (DOT_HEIGHT + DOT_GAP_Y) + DOT_HEIGHT / 2
      const fill = isOn ? '#243f08' : 'rgba(72,97,24,0.12)'

      circles.push(`<ellipse cx="${x}" cy="${y}" rx="${DOT_WIDTH / 2}" ry="${DOT_HEIGHT / 2}" fill="${fill}" />`)
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CELL_WIDTH} ${CELL_HEIGHT}" fill="none"><rect width="${CELL_WIDTH}" height="${CELL_HEIGHT}" rx="3" fill="rgba(116,149,32,0.44)"/>${circles.join('')}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const GLYPH_STYLE_MAP: Record<string, CSSProperties> = Object.fromEntries(
  Object.entries(FONT_MAP).map(([character, pixels]) => [
    character,
    {
      backgroundImage: createGlyphDataUri(pixels),
    },
  ]),
)

function normalizeLine(line: string, columns: number) {
  return line
    .slice(0, columns)
    .split('')
    .map((char) => (FONT_MAP[char] ? char : FALLBACK_CHAR))
    .join('')
    .padEnd(columns, FALLBACK_CHAR)
}

function buildDisplayRows(displayRows: string[], columns: number, rows: number) {
  const normalizedRows = displayRows.slice(0, rows).map((row) => normalizeLine(row, columns))

  while (normalizedRows.length < rows) {
    normalizedRows.push(FALLBACK_CHAR.repeat(columns))
  }

  return normalizedRows
}

const LcdCell = memo(function LcdCell({ character }: { character: string }) {
  const style = GLYPH_STYLE_MAP[character] ?? GLYPH_STYLE_MAP[FALLBACK_CHAR]

  return <div className="lcd-cell" style={style} aria-hidden="true" />
})

function LcdDisplayComponent({ columns, rows, displayRows }: LcdDisplayProps) {
  const lines = buildDisplayRows(displayRows, columns, rows)

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

export const LcdDisplay = memo(LcdDisplayComponent, (previousProps, nextProps) => {
  if (previousProps.columns !== nextProps.columns || previousProps.rows !== nextProps.rows) {
    return false
  }

  if (previousProps.displayRows.length !== nextProps.displayRows.length) {
    return false
  }

  return previousProps.displayRows.every((row, index) => row === nextProps.displayRows[index])
})
