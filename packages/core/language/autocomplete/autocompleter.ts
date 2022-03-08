import { ParentReference } from '../node'
import { SuggestedNode } from './suggested_node'
import { SuggestionGenerator } from '../node_category_registry'

export class Autocompleter {
  constants: SuggestedNode[]
  staticFunctions: SuggestionGenerator[]
  dynamicFunctions: SuggestionGenerator[]
  prefixOverrides: Map<string, SuggestionGenerator[]>

  constructor(
    contants: SuggestedNode[],
    staticFunctions: SuggestionGenerator[],
    dynamicFunctions: SuggestionGenerator[],
    prefixOverrides: Map<string, SuggestionGenerator[]>
  ) {
    this.constants = contants
    this.staticFunctions = staticFunctions
    this.dynamicFunctions = dynamicFunctions
    this.prefixOverrides = prefixOverrides
  }

  getStaticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    let suggestions: SuggestedNode[] = this.constants
    this.staticFunctions.forEach((generator: SuggestionGenerator) => {
      suggestions = suggestions.concat(generator.staticSuggestions(parent, index))
    })
    return suggestions
  }

  getDynamicSuggestions(parent: ParentReference, index: number, userInput: string): SuggestedNode[] {
    let suggestions: SuggestedNode[] = []
    this.dynamicFunctions.forEach((generator: SuggestionGenerator) => {
      suggestions = suggestions.concat(generator.dynamicSuggestions(parent, index, userInput))
    })
    return suggestions
  }

  getPrefixSuggestions(parent: ParentReference, index: number, userInput: string): SuggestedNode[] {
    if (this.prefixOverrides.has(userInput[0])) {
      let suggestions: SuggestedNode[] = []
      this.prefixOverrides.get(userInput[0]).forEach((generator: SuggestionGenerator) => {
        suggestions = suggestions.concat(generator.dynamicSuggestions(parent, index, userInput))
      })
      return suggestions
    }
    return null
  }
}
