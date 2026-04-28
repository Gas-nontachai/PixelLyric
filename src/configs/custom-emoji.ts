import type { SpecialTextGlyph } from '@/configs/special-text'

export const CUSTOM_EMOJI_LIMIT = 8

export type CustomEmojiItem = {
  id: string
  group: string
  label: string
  display: string
  glyph: SpecialTextGlyph
}

export type CustomEmojiGroup = {
  label: string
  items: CustomEmojiItem[]
}

function glyph(rows: string[]): SpecialTextGlyph {
  return rows.map((row) => row.padEnd(5, '0').slice(0, 5).split('').map((value) => (value === '1' ? 1 : 0)))
}

export const CUSTOM_EMOJI_ITEMS: CustomEmojiItem[] = [
  { id: 'smile', group: 'Faces', label: 'smile', display: '☺', glyph: glyph(['00000', '01010', '01010', '00000', '10001', '01110', '00000', '00000']) },
  { id: 'grin', group: 'Faces', label: 'grin', display: '☻', glyph: glyph(['00000', '01010', '01010', '00000', '11111', '01110', '00000', '00000']) },
  { id: 'wink', group: 'Faces', label: 'wink', display: '◕', glyph: glyph(['00000', '01000', '01010', '00000', '10001', '01110', '00000', '00000']) },
  { id: 'sad', group: 'Faces', label: 'sad', display: '☹', glyph: glyph(['00000', '01010', '01010', '00000', '01110', '10001', '00000', '00000']) },
  { id: 'surprised', group: 'Faces', label: 'surprised', display: '⊙', glyph: glyph(['00000', '01010', '01010', '00000', '01110', '01010', '01110', '00000']) },
  { id: 'sleepy', group: 'Faces', label: 'sleepy', display: '◔', glyph: glyph(['00000', '11011', '00000', '00111', '00010', '00100', '00111', '00000']) },
  { id: 'cool', group: 'Faces', label: 'cool', display: '◉', glyph: glyph(['00000', '11011', '11011', '00000', '10001', '01110', '00000', '00000']) },
  { id: 'love_eyes', group: 'Faces', label: 'love eyes', display: '♡', glyph: glyph(['00000', '01010', '11111', '00000', '10001', '01110', '00000', '00000']) },
  { id: 'heart_outline', group: 'Love', label: 'heart', display: '❤', glyph: glyph(['00000', '01010', '10101', '10001', '01010', '00100', '00000', '00000']) },
  { id: 'broken_heart', group: 'Love', label: 'broken heart', display: '❦', glyph: glyph(['00000', '01010', '10100', '10010', '01010', '00100', '00000', '00000']) },
  { id: 'small_heart', group: 'Love', label: 'small heart', display: '❥', glyph: glyph(['00000', '00000', '01010', '11111', '01110', '00100', '00000', '00000']) },
  { id: 'sparkle_heart', group: 'Love', label: 'sparkle heart', display: '❧', glyph: glyph(['00100', '01010', '10101', '10001', '01010', '10101', '00100', '00000']) },
  { id: 'kiss', group: 'Love', label: 'kiss', display: '✕', glyph: glyph(['00000', '10001', '01010', '00100', '01010', '10001', '00000', '00000']) },
  { id: 'flower', group: 'Love', label: 'flower', display: '✿', glyph: glyph(['00100', '10101', '01110', '11111', '01110', '10101', '00100', '00000']) },
  { id: 'ring', group: 'Love', label: 'ring', display: '◌', glyph: glyph(['00100', '01010', '00100', '01110', '10001', '10001', '01110', '00000']) },
  { id: 'bow', group: 'Love', label: 'bow', display: '∞', glyph: glyph(['00000', '11011', '10101', '01110', '10101', '11011', '00000', '00000']) },
  { id: 'note', group: 'Music', label: 'note', display: '♪', glyph: glyph(['00010', '00011', '00010', '00010', '01110', '11110', '01100', '00000']) },
  { id: 'double_note', group: 'Music', label: 'double note', display: '♫', glyph: glyph(['01010', '01011', '01010', '01010', '11010', '11010', '00000', '00000']) },
  { id: 'play_icon', group: 'Music', label: 'play', display: '▶', glyph: glyph(['01000', '01100', '01110', '01111', '01110', '01100', '01000', '00000']) },
  { id: 'pause_icon', group: 'Music', label: 'pause', display: 'Ⅱ', glyph: glyph(['00000', '11011', '11011', '11011', '11011', '11011', '00000', '00000']) },
  { id: 'speaker', group: 'Music', label: 'speaker', display: '▸', glyph: glyph(['00001', '00011', '01111', '11111', '01111', '00011', '00001', '00000']) },
  { id: 'sound_wave', group: 'Music', label: 'sound wave', display: '≋', glyph: glyph(['00000', '01010', '10101', '00000', '01010', '10101', '00000', '00000']) },
  { id: 'mic', group: 'Music', label: 'mic', display: '♙', glyph: glyph(['01110', '10001', '10001', '01110', '00100', '01110', '00100', '00000']) },
  { id: 'headphones', group: 'Music', label: 'headphones', display: '♬', glyph: glyph(['01110', '10001', '10101', '10101', '10101', '00000', '00000', '00000']) },
  { id: 'check', group: 'Status', label: 'check', display: '✓', glyph: glyph(['00000', '00001', '00010', '10100', '01000', '00000', '00000', '00000']) },
  { id: 'cross', group: 'Status', label: 'cross', display: '✖', glyph: glyph(['10001', '01010', '00100', '01010', '10001', '00000', '00000', '00000']) },
  { id: 'warning', group: 'Status', label: 'warning', display: '⚠', glyph: glyph(['00100', '01010', '01010', '10001', '10101', '11111', '00000', '00000']) },
  { id: 'bell', group: 'Status', label: 'bell', display: '◍', glyph: glyph(['00100', '01110', '01110', '01110', '11111', '00100', '00000', '00000']) },
  { id: 'lock', group: 'Status', label: 'lock', display: '▣', glyph: glyph(['01110', '10001', '11111', '11011', '11011', '11111', '00000', '00000']) },
  { id: 'unlock', group: 'Status', label: 'unlock', display: '▢', glyph: glyph(['01110', '10000', '11111', '11011', '11011', '11111', '00000', '00000']) },
  { id: 'battery_empty', group: 'Status', label: 'battery empty', display: '▱', glyph: glyph(['00000', '11110', '10001', '10001', '10001', '11110', '00000', '00000']) },
  { id: 'battery_full', group: 'Status', label: 'battery full', display: '▰', glyph: glyph(['00000', '11110', '11111', '11111', '11111', '11110', '00000', '00000']) },
  { id: 'sun', group: 'Weather', label: 'sun', display: '☼', glyph: glyph(['10101', '01110', '11111', '11111', '11111', '01110', '10101', '00000']) },
  { id: 'moon', group: 'Weather', label: 'moon', display: '☾', glyph: glyph(['00111', '01100', '11000', '11000', '11000', '01100', '00111', '00000']) },
  { id: 'cloud', group: 'Weather', label: 'cloud', display: '☁', glyph: glyph(['00000', '01100', '10010', '10001', '11111', '00000', '00000', '00000']) },
  { id: 'rain', group: 'Weather', label: 'rain', display: '☂', glyph: glyph(['01110', '11111', '00100', '01010', '00000', '01010', '00000', '00000']) },
  { id: 'umbrella', group: 'Weather', label: 'umbrella', display: '♧', glyph: glyph(['01110', '11111', '10101', '00100', '00100', '10100', '01000', '00000']) },
  { id: 'snow', group: 'Weather', label: 'snow', display: '❄', glyph: glyph(['00100', '10101', '01110', '11111', '01110', '10101', '00100', '00000']) },
  { id: 'lightning', group: 'Weather', label: 'lightning', display: 'ϟ', glyph: glyph(['00010', '00100', '01110', '00100', '01000', '10000', '00000', '00000']) },
  { id: 'fire', group: 'Weather', label: 'fire', display: '♨', glyph: glyph(['00100', '01000', '10100', '10101', '01110', '01110', '00000', '00000']) },
  { id: 'star', group: 'Game', label: 'star', display: '★', glyph: glyph(['00100', '10101', '01110', '11111', '01110', '10101', '00100', '00000']) },
  { id: 'crown', group: 'Game', label: 'crown', display: '♛', glyph: glyph(['10101', '11111', '11111', '01110', '11111', '11111', '00000', '00000']) },
  { id: 'gem', group: 'Game', label: 'gem', display: '◆', glyph: glyph(['00100', '01010', '10001', '10001', '01010', '00100', '00000', '00000']) },
  { id: 'skull', group: 'Game', label: 'skull', display: '☠', glyph: glyph(['01110', '10101', '11111', '01110', '01110', '10101', '00000', '00000']) },
  { id: 'sword', group: 'Game', label: 'sword', display: '†', glyph: glyph(['00100', '00100', '11111', '00100', '00100', '01010', '10001', '00000']) },
  { id: 'shield', group: 'Game', label: 'shield', display: '⬟', glyph: glyph(['11111', '10001', '10001', '10001', '01010', '00100', '00000', '00000']) },
  { id: 'dice', group: 'Game', label: 'dice', display: '⚂', glyph: glyph(['11111', '10001', '10101', '10001', '10101', '10001', '11111', '00000']) },
  { id: 'ghost', group: 'Game', label: 'ghost', display: '♟', glyph: glyph(['01110', '10101', '10101', '11111', '11111', '10101', '00000', '00000']) },
  { id: 'arrow_up', group: 'UI', label: 'arrow up', display: '▲', glyph: glyph(['00100', '01110', '11111', '00100', '00100', '00100', '00000', '00000']) },
  { id: 'arrow_down', group: 'UI', label: 'arrow down', display: '▼', glyph: glyph(['00100', '00100', '00100', '11111', '01110', '00100', '00000', '00000']) },
  { id: 'ui_arrow_left', group: 'UI', label: 'arrow left', display: '◀', glyph: glyph(['00100', '01100', '11111', '01100', '00100', '00000', '00000', '00000']) },
  { id: 'ui_arrow_right', group: 'UI', label: 'arrow right', display: '▷', glyph: glyph(['00100', '00110', '11111', '00110', '00100', '00000', '00000', '00000']) },
  { id: 'spinner_one', group: 'UI', label: 'spinner 1', display: '◜', glyph: glyph(['11100', '10000', '10000', '00000', '00000', '00000', '00000', '00000']) },
  { id: 'spinner_two', group: 'UI', label: 'spinner 2', display: '◝', glyph: glyph(['00111', '00001', '00001', '00000', '00000', '00000', '00000', '00000']) },
  { id: 'spinner_three', group: 'UI', label: 'spinner 3', display: '◞', glyph: glyph(['00000', '00000', '00000', '00000', '00001', '00001', '00111', '00000']) },
  { id: 'spinner_four', group: 'UI', label: 'spinner 4', display: '◟', glyph: glyph(['00000', '00000', '00000', '00000', '10000', '10000', '11100', '00000']) },
  { id: 'loading_dot', group: 'UI', label: 'loading dot', display: '•', glyph: glyph(['00000', '00000', '01110', '11111', '11111', '01110', '00000', '00000']) },
  { id: 'cursor_block', group: 'UI', label: 'cursor block', display: '▮', glyph: glyph(['11111', '11111', '11111', '11111', '11111', '11111', '11111', '00000']) },
]

export const CUSTOM_EMOJI_GROUPS: CustomEmojiGroup[] = Array.from(
  new Set(CUSTOM_EMOJI_ITEMS.map((item) => item.group)),
  (group) => ({
    label: group,
    items: CUSTOM_EMOJI_ITEMS.filter((item) => item.group === group),
  }),
)

export const CUSTOM_EMOJI_ITEM_BY_DISPLAY = new Map(
  CUSTOM_EMOJI_ITEMS.map((item) => [item.display, item]),
)

export const CUSTOM_EMOJI_GLYPHS = Object.fromEntries(
  CUSTOM_EMOJI_ITEMS.map((item) => [item.display, item.glyph]),
) as Record<string, SpecialTextGlyph>

export function getCustomEmojiItem(character: string) {
  return CUSTOM_EMOJI_ITEM_BY_DISPLAY.get(character) ?? null
}

export function hasCustomEmoji(value: string) {
  return Array.from(value).some((character) => CUSTOM_EMOJI_ITEM_BY_DISPLAY.has(character))
}
