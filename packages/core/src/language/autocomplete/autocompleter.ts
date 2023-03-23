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
    const suggestionSets = await Promise.all(
      this.dynamicFunctions.map(async (generator: SuggestionGenerator) => {
        return generator.dynamicSuggestions(parent, index, userInput)
      })
    )

    return suggestionSets.flat()
  }

  async getPrefixSuggestions(parent: ParentReference, index: number, userInput: string): Promise<SuggestedNode[]> {
    if (this.prefixOverrides.has(userInput[0])) {
      const generators = this.prefixOverrides.get(userInput[0])

      const suggestionSets = await Promise.all(
        generators.map(async (generator: SuggestionGenerator) => {
          return generator.dynamicSuggestions(parent, index, userInput)
        })
      )

      return suggestionSets.flat()
    }
    return null
  }
}
