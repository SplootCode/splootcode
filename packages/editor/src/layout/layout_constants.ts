/* Within nodes */
export const NODE_INLINE_SPACING = 4
export const NODE_INLINE_SPACING_SMALL = 4

/* Node block row size and spacing */
export const NODE_BLOCK_HEIGHT = 20
export const NODE_TEXT_OFFSET = 15
export const ROW_SPACING = 8

/* Strings */
export const STRING_CAP_WIDTH = 16
export const MAX_STRING_WIDTH = 500

/* Expressions */
export const EXPRESSION_TOKEN_SPACING = 6

/* Annotations */
export const LOOP_ANNOTATION_HEIGHT = 14

export const BRACKET_WIDTH = 4

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
export function getTextWidth(text: string, font: string) {
  // re-use canvas object for better performance
  const canvas = getTextWidth['canvas'] || (getTextWidth['canvas'] = document.createElement('canvas'))
  const context = canvas.getContext('2d')
  context.font = font
  const metrics = context.measureText(text)
  return metrics.width
}

export function getStringPreHeight(text: string, maxWidth: number) {
  let pre: HTMLPreElement = getStringPreHeight['pre']
  if (!pre) {
    pre = document.createElement('pre')
    pre.classList.add('string-node', 'measurement')
    pre.style.maxWidth = MAX_STRING_WIDTH + 'px'
    document.body.appendChild(pre)
    getStringPreHeight['pre'] = pre
  }
  pre.textContent = text
  return pre.getBoundingClientRect().height
}

export function stringWidth(s: string) {
  return getTextWidth(s, "16px 'Karla'")
}

export function stringLiteralDimensions(s: string): [number, number] {
  const lines = s.split('\n')
  const maxWidth = Math.min(
    lines.reduce((prev, line) => {
      return Math.max(prev, getTextWidth(line, "16px 'Inconsolata'"))
    }, 0),
    MAX_STRING_WIDTH
  )
  // Need to add extra new line because last newline of a `pre` seems to be ignored in the height.
  const height = getStringPreHeight(s + '\n', maxWidth)
  return [maxWidth, height]
}

export function placeholderWidth(s: string) {
  return getTextWidth(s, "italic 16px 'Karla'") + EXPRESSION_TOKEN_SPACING * 2
}

export function labelStringWidth(s: string) {
  return getTextWidth(s, "16px 'Karla'")
}

export async function awaitFontsLoaded() {
  const promises = [document.fonts.load('16px "Karla"'), document.fonts.load("16px 'Inconsolata'")]
  await Promise.all(promises)
}

export function preloadFonts() {
  stringWidth('loadfontplz')
  stringLiteralDimensions('loadfontplz')
  placeholderWidth('loadfontplz')
}
