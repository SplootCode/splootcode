/* Within nodes */
export const NODE_INLINE_SPACING = 4
export const NODE_INLINE_SPACING_SMALL = 4

/* Node block row size and spacing */
export const NODE_BLOCK_HEIGHT = 20
export const NODE_TEXT_OFFSET = 15
export const ROW_SPACING = 8

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

export function stringWidth(s: string) {
  return getTextWidth(s, "16px 'Karla'")
}

export function labelStringWidth(s: string) {
  return getTextWidth(s, "16px 'Karla'")
}
