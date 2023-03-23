import { AutoCompleteRegistry } from './autocomplete/registry'
import { LayoutComponentType } from './type_registry'
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

  // 10
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

  // 20
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

  // 30
  PythonExpressionToken,
  PythonAssignable,
  PythonFunctionName,
  PythonLoopVariable,
  PythonFunctionArgumentDeclaration,
  PythonModuleIdentifier,
  PythonModuleAttribute,
  PythonDictionaryKeyValue,
  PythonFunctionArgument,
  PythonFunctionArgumentValue,

  // 40
  PythonDecorator,
}

export interface SuggestionGenerator {
  constantSuggestions?: () => SuggestedNode[]
  staticSuggestions?: (parent: ParentReference, index: number) => SuggestedNode[]
  dynamicSuggestions?: (parent: ParentReference, index: number, textInput: string) => Promise<SuggestedNode[]>
}

const CategoryMap = new Map<NodeCategory, Set<string>>()
const TypeToCategoryMap = new Map<string, Set<NodeCategory>>()
const BlankFillMap = new Map<NodeCategory, () => SplootNode>()

const autocompleteRegistry = new AutoCompleteRegistry()

export function getLayoutComponentForCategory(category: NodeCategory): LayoutComponentType {
  switch (category) {
    case NodeCategory.PythonStatement:
      return LayoutComponentType.CHILD_SET_BLOCK
    case NodeCategory.PythonElseBlock:
      return LayoutComponentType.CHILD_SET_STACK
    case NodeCategory.PythonExpression:
      return LayoutComponentType.CHILD_SET_TREE_BRACKETS
    case NodeCategory.PythonExpressionToken:
    case NodeCategory.PythonAssignable:
    case NodeCategory.PythonFunctionArgumentDeclaration:
      return LayoutComponentType.CHILD_SET_TOKEN_LIST
    default:
      return LayoutComponentType.CHILD_SET_STACK
  }
}

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
  autocompleteRegistry.registerSuggestionGenerator(category, suggestionGenerator)
}

export function registerAutocompleteAdapter(category: NodeCategory, wrappedCategory: NodeCategory) {
  autocompleteRegistry.registerAutocompleteAdapater(category, wrappedCategory)
}

export function getAutocompleteRegistry() {
  return autocompleteRegistry
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
