export type SpecialTextGlyph = number[][]

export type SpecialTextItem = {
  id: string
  group: string
  label: string
  display: string
  value: string
  code: number
  glyph: SpecialTextGlyph
}

export type SpecialTextGroup = {
  label: string
  items: SpecialTextItem[]
}

function glyph(rows: string[]): SpecialTextGlyph {
  return rows.map((row) => row.padEnd(5, '0').slice(0, 5).split('').map((value) => (value === '1' ? 1 : 0)))
}

export const SPECIAL_TEXT_ITEMS: SpecialTextItem[] = [
  { id: 'arrow_right', group: 'Arrows', label: 'arrow_right', display: '→', value: '\u007E', code: 126, glyph: glyph(['00000', '00100', '00010', '11111', '00010', '00100', '00000', '00000']) },
  { id: 'arrow_left', group: 'Arrows', label: 'arrow_left', display: '←', value: '\u007F', code: 127, glyph: glyph(['00000', '00100', '01000', '11111', '01000', '00100', '00000', '00000']) },
  { id: 'heart', group: 'Symbols', label: 'heart', display: '♥', value: '\u0003', code: 3, glyph: glyph(['00000', '01010', '11111', '11111', '01110', '00100', '00000', '00000']) },
  { id: 'degree', group: 'Symbols', label: 'degree', display: '°', value: '\u00DF', code: 223, glyph: glyph(['01100', '10010', '10010', '01100', '00000', '00000', '00000', '00000']) },
  { id: 'ohm', group: 'Symbols', label: 'ohm', display: 'Ω', value: '\u00F4', code: 244, glyph: glyph(['01110', '10001', '10001', '10001', '01010', '11011', '00000', '00000']) },
  { id: 'micro', group: 'Symbols', label: 'micro', display: 'μ', value: '\u00E4', code: 228, glyph: glyph(['00000', '00000', '10001', '10001', '10011', '11101', '10000', '10000']) },
  { id: 'pi', group: 'Symbols', label: 'pi', display: 'π', value: '\u00F7', code: 247, glyph: glyph(['00000', '00000', '11111', '01010', '01010', '01010', '00000', '00000']) },
  { id: 'full_block', group: 'Blocks', label: 'full_block', display: '█', value: '\u00FF', code: 255, glyph: glyph(['11111', '11111', '11111', '11111', '11111', '11111', '11111', '11111']) },
  { id: 'dark_block', group: 'Blocks', label: 'dark_block', display: '▓', value: '\u00DB', code: 219, glyph: glyph(['11111', '10111', '11101', '10111', '11101', '10111', '11101', '11111']) },
  { id: 'medium_block', group: 'Blocks', label: 'medium_block', display: '▒', value: '\u00B2', code: 178, glyph: glyph(['10101', '01010', '10101', '01010', '10101', '01010', '10101', '01010']) },
  { id: 'light_block', group: 'Blocks', label: 'light_block', display: '░', value: '\u00B0', code: 176, glyph: glyph(['10000', '00100', '00001', '01000', '00010', '10000', '00100', '00001']) },
  { id: 'upper_half', group: 'Blocks', label: 'upper_half', display: '▀', value: '\u00DF', code: 223, glyph: glyph(['11111', '11111', '11111', '11111', '00000', '00000', '00000', '00000']) },
  { id: 'lower_half', group: 'Blocks', label: 'lower_half', display: '▄', value: '\u00DC', code: 220, glyph: glyph(['00000', '00000', '00000', '00000', '11111', '11111', '11111', '11111']) },
  { id: 'square', group: 'Shapes', label: 'square', display: '■', value: '\u00FE', code: 254, glyph: glyph(['00000', '11111', '11111', '11111', '11111', '11111', '00000', '00000']) },
  { id: 'circle_filled', group: 'Shapes', label: 'circle_filled', display: '●', value: '\u00F9', code: 249, glyph: glyph(['00000', '01110', '11111', '11111', '11111', '01110', '00000', '00000']) },
  { id: 'circle_empty', group: 'Shapes', label: 'circle_empty', display: '○', value: '\u00FA', code: 250, glyph: glyph(['00000', '01110', '10001', '10001', '10001', '01110', '00000', '00000']) },
  { id: 'katakana_a', group: 'Katakana', label: 'a', display: 'ア', value: '\u00B1', code: 177, glyph: glyph(['11111', '00001', '00010', '00100', '00100', '01000', '00000', '00000']) },
  { id: 'katakana_i', group: 'Katakana', label: 'i', display: 'イ', value: '\u00B2', code: 178, glyph: glyph(['00001', '00010', '00100', '01100', '10100', '00100', '00000', '00000']) },
  { id: 'katakana_u', group: 'Katakana', label: 'u', display: 'ウ', value: '\u00B3', code: 179, glyph: glyph(['00100', '11111', '10001', '00001', '00010', '01100', '00000', '00000']) },
  { id: 'katakana_e', group: 'Katakana', label: 'e', display: 'エ', value: '\u00B4', code: 180, glyph: glyph(['11111', '00100', '00100', '00100', '00100', '11111', '00000', '00000']) },
  { id: 'katakana_o', group: 'Katakana', label: 'o', display: 'オ', value: '\u00B5', code: 181, glyph: glyph(['00100', '11111', '00101', '00110', '01100', '10100', '00000', '00000']) },
  { id: 'katakana_ka', group: 'Katakana', label: 'ka', display: 'カ', value: '\u00B6', code: 182, glyph: glyph(['00100', '11111', '00101', '00101', '01001', '10010', '00000', '00000']) },
  { id: 'katakana_ki', group: 'Katakana', label: 'ki', display: 'キ', value: '\u00B7', code: 183, glyph: glyph(['00100', '11111', '00100', '11111', '00100', '00100', '00000', '00000']) },
  { id: 'katakana_ku', group: 'Katakana', label: 'ku', display: 'ク', value: '\u00B8', code: 184, glyph: glyph(['01000', '11110', '00010', '00100', '01000', '10000', '00000', '00000']) },
  { id: 'katakana_ke', group: 'Katakana', label: 'ke', display: 'ケ', value: '\u00B9', code: 185, glyph: glyph(['01000', '11111', '01000', '11111', '01000', '10000', '00000', '00000']) },
  { id: 'katakana_ko', group: 'Katakana', label: 'ko', display: 'コ', value: '\u00BA', code: 186, glyph: glyph(['11111', '00001', '00001', '00001', '00001', '11111', '00000', '00000']) },
  { id: 'katakana_sa', group: 'Katakana', label: 'sa', display: 'サ', value: '\u00BB', code: 187, glyph: glyph(['01010', '11111', '01010', '01010', '00100', '01000', '00000', '00000']) },
  { id: 'katakana_shi', group: 'Katakana', label: 'shi', display: 'シ', value: '\u00BC', code: 188, glyph: glyph(['10000', '00001', '10000', '00010', '00100', '11000', '00000', '00000']) },
  { id: 'katakana_su', group: 'Katakana', label: 'su', display: 'ス', value: '\u00BD', code: 189, glyph: glyph(['11110', '00010', '00100', '01000', '10100', '00010', '00000', '00000']) },
  { id: 'katakana_se', group: 'Katakana', label: 'se', display: 'セ', value: '\u00BE', code: 190, glyph: glyph(['01000', '11111', '01001', '01010', '01100', '01000', '00000', '00000']) },
  { id: 'katakana_so', group: 'Katakana', label: 'so', display: 'ソ', value: '\u00BF', code: 191, glyph: glyph(['10001', '10001', '00010', '00010', '00100', '01000', '00000', '00000']) },
  { id: 'katakana_tsu', group: 'Katakana', label: 'tsu', display: 'ツ', value: '\u00C2', code: 194, glyph: glyph(['10101', '10101', '00001', '00010', '00100', '11000', '00000', '00000']) },
  { id: 'katakana_n', group: 'Katakana', label: 'n', display: 'ン', value: '\u00DD', code: 221, glyph: glyph(['10000', '00001', '00010', '00100', '01000', '10000', '00000', '00000']) },
]

export const SPECIAL_TEXT_GROUPS: SpecialTextGroup[] = Array.from(
  new Set(SPECIAL_TEXT_ITEMS.map((item) => item.group)),
  (group) => ({
    label: group,
    items: SPECIAL_TEXT_ITEMS.filter((item) => item.group === group),
  }),
)

export const SPECIAL_TEXT_CODE_BY_DISPLAY = new Map(
  SPECIAL_TEXT_ITEMS.map((item) => [item.display, item.code]),
)

export const SPECIAL_TEXT_ITEM_BY_DISPLAY = new Map(
  SPECIAL_TEXT_ITEMS.map((item) => [item.display, item]),
)

export const SPECIAL_TEXT_GLYPHS = Object.fromEntries(
  SPECIAL_TEXT_ITEMS.map((item) => [item.display, item.glyph]),
) as Record<string, SpecialTextGlyph>

export function getSpecialTextItem(character: string) {
  return SPECIAL_TEXT_ITEM_BY_DISPLAY.get(character) ?? null
}

export function getSpecialTextCode(character: string) {
  return SPECIAL_TEXT_CODE_BY_DISPLAY.get(character) ?? null
}

export function hasSpecialText(value: string) {
  return Array.from(value).some((character) => SPECIAL_TEXT_CODE_BY_DISPLAY.has(character))
}
