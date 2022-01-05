import { ParentReference } from './node'
import { SuggestedNode } from './suggested_node'

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
  PythonElseBlock,
  PythonExpression,
  PythonExpressionToken,
  PythonAssignableExpressionToken,
}

export interface SuggestionGenerator {
  staticSuggestions: (parent: ParentReference, index: number) => SuggestedNode[]
  dynamicSuggestions: (parent: ParentReference, index: number, textInput: string) => SuggestedNode[]
}

export class EmptySuggestionGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    return []
  }
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

const CategoryMap = new Map<NodeCategory, Set<string>>()
const AutocompleteFunctionMap = new Map<NodeCategory, Set<SuggestionGenerator>>()
const TypeToCategoryMap = new Map<string, Set<NodeCategory>>()

export function registerNodeCateogry(nodeType: string, category: NodeCategory, autocomplete: SuggestionGenerator) {
  if (!CategoryMap.has(category)) {
    CategoryMap.set(category, new Set<string>())
  }
  if (!AutocompleteFunctionMap.has(category)) {
    AutocompleteFunctionMap.set(category, new Set<SuggestionGenerator>())
  }
  CategoryMap.get(category).add(nodeType)
  AutocompleteFunctionMap.get(category).add(autocomplete)
  if (!TypeToCategoryMap.has(nodeType)) {
    TypeToCategoryMap.set(nodeType, new Set<NodeCategory>())
  }
  TypeToCategoryMap.get(nodeType).add(category)
}

export function getNodeCategoriesForType(typeName: string): Set<NodeCategory> {
  return TypeToCategoryMap.get(typeName)
}

export function getNodesForCategory(category: NodeCategory) {
  return CategoryMap.get(category)
}

export function isNodeInCategory(nodeType: string, category: NodeCategory) {
  return CategoryMap.get(category).has(nodeType)
}

export function getAutocompleteFunctionsForCategory(category: NodeCategory): Set<SuggestionGenerator> {
  if (!AutocompleteFunctionMap.has(category)) {
    return new Set<SuggestionGenerator>()
  }
  return AutocompleteFunctionMap.get(category)
}
