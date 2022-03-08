import { Autocompleter } from './autocompleter'
import { NodeCategory, SuggestionGenerator } from '../node_category_registry'
import { SuggestedNode } from './suggested_node'

export class AutoCompleteRegistry {
  constantSuggestions: Map<NodeCategory, SuggestedNode[]>
  adapterMap: Map<NodeCategory, NodeCategory>
  staticFunctionMap: Map<NodeCategory, SuggestionGenerator[]>
  dynamicFunctionMap: Map<NodeCategory, SuggestionGenerator[]>

  prefixOverrides: Map<NodeCategory, Map<string, SuggestionGenerator[]>>

  autocompleterCache: Map<NodeCategory, Autocompleter>

  constructor() {
    this.constantSuggestions = new Map<NodeCategory, SuggestedNode[]>()
    this.staticFunctionMap = new Map<NodeCategory, SuggestionGenerator[]>()
    this.dynamicFunctionMap = new Map<NodeCategory, SuggestionGenerator[]>()
    this.adapterMap = new Map<NodeCategory, NodeCategory>()
    this.prefixOverrides = new Map<NodeCategory, Map<string, SuggestionGenerator[]>>()
    this.autocompleterCache = new Map<NodeCategory, Autocompleter>()
  }

  registerAutocompleteAdapater(category: NodeCategory, wrappedCategory: NodeCategory) {
    this.adapterMap.set(category, wrappedCategory)
  }

  getAdapatableCategories(category: NodeCategory): Set<NodeCategory> {
    const categories = new Set<NodeCategory>()
    if (this.adapterMap.has(category)) {
      const cat = this.adapterMap.get(category)
      categories.add(cat)
      this.getAdapatableCategories(cat).forEach((childCat) => {
        categories.add(childCat)
      })
    }
    return categories
  }

  registerSuggestionGenerator(category: NodeCategory, autocomplete: SuggestionGenerator) {
    if (autocomplete.constantSuggestions) {
      if (!this.constantSuggestions.has(category)) {
        this.constantSuggestions.set(category, [])
      }
      this.constantSuggestions.get(category).push(...autocomplete.constantSuggestions())
    }
    if (autocomplete.staticSuggestions) {
      if (!this.staticFunctionMap.has(category)) {
        this.staticFunctionMap.set(category, [])
      }
      this.staticFunctionMap.get(category).push(autocomplete)
    }
    if (autocomplete.dynamicSuggestions) {
      if (!this.dynamicFunctionMap.has(category)) {
        this.dynamicFunctionMap.set(category, [])
      }
      this.dynamicFunctionMap.get(category).push(autocomplete)
    }
  }

  registerPrefixOverride(prefix: string, category: NodeCategory, suggestionGenerator: SuggestionGenerator) {
    if (!this.prefixOverrides.has(category)) {
      this.prefixOverrides.set(category, new Map<string, SuggestionGenerator[]>())
    }
    const prefixMapping = this.prefixOverrides.get(category)

    if (!prefixMapping.has(prefix)) {
      prefixMapping.set(prefix, [])
    }

    prefixMapping.get(prefix).push(suggestionGenerator)
  }

  getAutocompleter(category: NodeCategory): Autocompleter {
    const existingAutocomplter = this.autocompleterCache.get(category)
    if (existingAutocomplter) {
      return existingAutocomplter
    }
    const constants = [...(this.constantSuggestions.get(category) || [])]
    const staticFunctions = [...(this.staticFunctionMap.get(category) || [])]
    const dynamicFunctions = [...(this.dynamicFunctionMap.get(category) || [])]
    const prefixOverrides = new Map<string, SuggestionGenerator[]>(this.prefixOverrides.get(category) || [])
    for (const wrappedCategory of this.getAdapatableCategories(category)) {
      constants.push(...(this.constantSuggestions.get(wrappedCategory) || []))
      staticFunctions.push(...(this.staticFunctionMap.get(wrappedCategory) || []))
      dynamicFunctions.push(...(this.dynamicFunctionMap.get(wrappedCategory) || []))
      const overrides = this.prefixOverrides.get(wrappedCategory) || new Map()
      overrides.forEach((suggestions, prefix) => {
        if (!prefixOverrides.has(prefix)) {
          prefixOverrides.set(prefix, [])
        }
        prefixOverrides.get(prefix).push(...suggestions)
      })
    }
    const autocompleter = new Autocompleter(constants, staticFunctions, dynamicFunctions, prefixOverrides)
    this.autocompleterCache.set(category, autocompleter)
    return autocompleter
  }
}
