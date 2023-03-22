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

  async getDynamicSuggestions(parent: ParentReference, index: number, userInput: string): Promise<SuggestedNode[]> {
    let suggestions: SuggestedNode[] = []
    await Promise.all(
      this.dynamicFunctions.map(async (generator: SuggestionGenerator) => {
        suggestions = suggestions.concat(await generator.dynamicSuggestions(parent, index, userInput))
      })
    )

    return suggestions
  }

  async getPrefixSuggestions(parent: ParentReference, index: number, userInput: string): Promise<SuggestedNode[]> {
    if (this.prefixOverrides.has(userInput[0])) {
      let suggestions: SuggestedNode[] = []

      await Promise.all(
        this.prefixOverrides.get(userInput[0]).map(async (generator: SuggestionGenerator) => {
          suggestions = suggestions.concat(await generator.dynamicSuggestions(parent, index, userInput))
        })
      )

      return suggestions
    }
    return null
  }
}
