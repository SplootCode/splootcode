import { AutoCompleteRegistry } from './autocomplete/registry'
import { ParentReference, SplootNode } from './node'
import { SuggestedNode } from './autocomplete/suggested_node'

export enum NodeCategory {
  Unknown = 0,
  HtmlDocument,
  DomNode,
  HtmlAttribute,
  HtmlAttributeValue,
  Statement,
  DeclaredIdentifier,
  Expression,
  ExpressionToken,
  ObjectPropertyDeclaration,
  JavascriptFile,
  ModuleSource,
  DataSheet,
  DataSheetFieldDeclaration,
  DataSheetRow,
  DataSheetEntry,
  StyleSheetStatement,
  StyleSheetSelector,
  StyleSheetProperty,
  StyleSheetPropertyValue,
  ComponentPropertyDeclaration,
  ComponentProperty,
  ComponentBodyStatement,
  JssBodyContent,
  JssStyleProperties,
  PythonFile,
  PythonStatement,
  PythonStatementContents,
  PythonElseBlock,
  PythonExpression,
  PythonExpressionToken,
  PythonAssignable,
  PythonFunctionName,
  PythonLoopVariable,
  PythonFunctionArgumentDeclaration,
  PythonModuleIdentifier,
  PythonModuleAttribute,
  PythonDictionaryKeyValue,
}

export interface SuggestionGenerator {
  constantSuggestions?: () => SuggestedNode[]
  staticSuggestions?: (parent: ParentReference, index: number) => SuggestedNode[]
  dynamicSuggestions?: (parent: ParentReference, index: number, textInput: string) => SuggestedNode[]
}

const CategoryMap = new Map<NodeCategory, Set<string>>()
const TypeToCategoryMap = new Map<string, Set<NodeCategory>>()
const BlankFillMap = new Map<NodeCategory, () => SplootNode>()

const autoCompleteRegistry = new AutoCompleteRegistry()

export function registerNodeCateogry(nodeType: string, category: NodeCategory) {
  if (!CategoryMap.has(category)) {
    CategoryMap.set(category, new Set<string>())
  }
  CategoryMap.get(category).add(nodeType)
  if (!TypeToCategoryMap.has(nodeType)) {
    TypeToCategoryMap.set(nodeType, new Set<NodeCategory>())
  }
  TypeToCategoryMap.get(nodeType).add(category)
}

export function getNodeCategoriesForType(typeName: string): Set<NodeCategory> {
  return TypeToCategoryMap.get(typeName) || new Set()
}

export function getNodesForCategory(category: NodeCategory) {
  return CategoryMap.get(category)
}

export function registerAutocompleter(category: NodeCategory, suggestionGenerator: SuggestionGenerator) {
  autoCompleteRegistry.registerSuggestionGenerator(category, suggestionGenerator)
}

export function registerAutocompleteAdapter(category: NodeCategory, wrappedCategory: NodeCategory) {
  autoCompleteRegistry.registerAutocompleteAdapater(category, wrappedCategory)
}

export function getAutocompleRegistry() {
  return autoCompleteRegistry
}

export function isNodeInCategory(nodeType: string, category: NodeCategory) {
  return CategoryMap.get(category).has(nodeType)
}

export function getBlankFillForCategory(category: NodeCategory): SplootNode {
  if (category in BlankFillMap) {
    return BlankFillMap[category]()
  }
  return null
}

export function registerBlankFillForNodeCategory(category: NodeCategory, generator: () => SplootNode) {
  BlankFillMap[category] = generator
}
