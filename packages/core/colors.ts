export enum HighlightColorCategory {
  NONE = 0,
  FUNCTION,
  FUNCTION_DEFINITION,
  VARIABLE,
  VARIABLE_DECLARATION,
  LITERAL_NUMBER,
  LITERAL_STRING,
  LITERAL_LIST,
  CONTROL,
  KEYWORD,
  OPERATOR,
  HTML_ELEMENT,
  HTML_ATTRIBUTE,
  STYLE_RULE,
  STYLE_PROPERTY,
}

const keywordColor = 'rgb(199, 166, 255)'

export function getColour(category: HighlightColorCategory): string {
  // Hardcode for now, but could be configurable in the future
  switch (category) {
    case HighlightColorCategory.NONE:
      return 'rgb(0, 0, 0)'
    case HighlightColorCategory.FUNCTION:
      return 'rgb(255 254 196)'
    case HighlightColorCategory.FUNCTION_DEFINITION:
      return keywordColor
    case HighlightColorCategory.VARIABLE_DECLARATION:
      return keywordColor
    case HighlightColorCategory.VARIABLE:
      return 'rgb(149, 217, 255)'
    case HighlightColorCategory.LITERAL_NUMBER:
      return 'rgb(124 179 253)'
    case HighlightColorCategory.LITERAL_STRING:
      return 'rgb(123 216 188)'
    case HighlightColorCategory.LITERAL_LIST:
      return keywordColor
    case HighlightColorCategory.KEYWORD:
      return keywordColor
    case HighlightColorCategory.CONTROL:
      return keywordColor
    case HighlightColorCategory.HTML_ELEMENT:
      return '#F3ABFF'
    case HighlightColorCategory.HTML_ATTRIBUTE:
      return 'rgb(149, 217, 255)'
    case HighlightColorCategory.STYLE_RULE:
      return 'rgb(199, 166, 255)'
    case HighlightColorCategory.STYLE_PROPERTY:
      return 'rgb(255 254 196)'
    default:
      return 'rgb(255, 255, 255)'
  }
}
