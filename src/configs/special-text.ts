export type SpecialTextItem = {
  label: string
  display: string
  value: string
  code: number
}

export type SpecialTextGroup = {
  label: string
  items: SpecialTextItem[]
}

export const SPECIAL_TEXT_GROUPS: SpecialTextGroup[] = [
  {
    label: 'Arrows',
    items: [
      { label: 'arrow_right', display: '→', value: '\u007E', code: 126 },
      { label: 'arrow_left', display: '←', value: '\u007F', code: 127 },
    ],
  },
  {
    label: 'Symbols',
    items: [
      { label: 'heart', display: '♥', value: '\u0003', code: 3 },
      { label: 'degree', display: '°', value: '\u00DF', code: 223 },
      { label: 'ohm', display: 'Ω', value: '\u00F4', code: 244 },
      { label: 'micro', display: 'μ', value: '\u00E4', code: 228 },
      { label: 'pi', display: 'π', value: '\u00F7', code: 247 },
    ],
  },
  {
    label: 'Blocks',
    items: [
      { label: 'full_block', display: '█', value: '\u00FF', code: 255 },
      { label: 'dark_block', display: '▓', value: '\u00DB', code: 219 },
      { label: 'medium_block', display: '▒', value: '\u00B2', code: 178 },
      { label: 'light_block', display: '░', value: '\u00B0', code: 176 },
      { label: 'upper_half', display: '▀', value: '\u00DF', code: 223 },
      { label: 'lower_half', display: '▄', value: '\u00DC', code: 220 },
    ],
  },
  {
    label: 'Shapes',
    items: [
      { label: 'square', display: '■', value: '\u00FE', code: 254 },
      { label: 'circle_filled', display: '●', value: '\u00F9', code: 249 },
      { label: 'circle_empty', display: '○', value: '\u00FA', code: 250 },
    ],
  },
  {
    label: 'Katakana',
    items: [
      { label: 'a', display: 'ア', value: '\u00B1', code: 177 },
      { label: 'i', display: 'イ', value: '\u00B2', code: 178 },
      { label: 'u', display: 'ウ', value: '\u00B3', code: 179 },
      { label: 'e', display: 'エ', value: '\u00B4', code: 180 },
      { label: 'o', display: 'オ', value: '\u00B5', code: 181 },
      { label: 'ka', display: 'カ', value: '\u00B6', code: 182 },
      { label: 'ki', display: 'キ', value: '\u00B7', code: 183 },
      { label: 'ku', display: 'ク', value: '\u00B8', code: 184 },
      { label: 'ke', display: 'ケ', value: '\u00B9', code: 185 },
      { label: 'ko', display: 'コ', value: '\u00BA', code: 186 },
      { label: 'sa', display: 'サ', value: '\u00BB', code: 187 },
      { label: 'shi', display: 'シ', value: '\u00BC', code: 188 },
      { label: 'su', display: 'ス', value: '\u00BD', code: 189 },
      { label: 'se', display: 'セ', value: '\u00BE', code: 190 },
      { label: 'so', display: 'ソ', value: '\u00BF', code: 191 },
      { label: 'tsu', display: 'ツ', value: '\u00C2', code: 194 },
      { label: 'n', display: 'ン', value: '\u00DD', code: 221 },
    ],
  },
]

export const SPECIAL_TEXT_ITEMS = SPECIAL_TEXT_GROUPS.flatMap((group) => group.items)

export const SPECIAL_TEXT_CODE_BY_DISPLAY = new Map(
  SPECIAL_TEXT_ITEMS.map((item) => [item.display, item.code]),
)

export function getSpecialTextCode(character: string) {
  return SPECIAL_TEXT_CODE_BY_DISPLAY.get(character) ?? null
}

export function hasSpecialText(value: string) {
  return Array.from(value).some((character) => SPECIAL_TEXT_CODE_BY_DISPLAY.has(character))
}
