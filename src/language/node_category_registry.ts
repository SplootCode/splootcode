import { ParentReference, SplootNode } from "./node";
import { SuggestedNode } from "./suggested_node";

export enum NodeCategory {
    Unknown = 0,
    Root,
    DocumentNode,
    DomNode,
    AttributeNode,
    AttributeValueNode,
    StyleNode,
    StyleValueNode,
    Ephemeral,
    Statement,
    DeclaredIdentifier,
    Expression,
    ExpressionToken,
}

export interface SuggestionGenerator {
  staticSuggestions: (parent: ParentReference, index: number) => SuggestedNode[];
  dynamicSuggestions: (parent: ParentReference, index: number, textInput: string) => SuggestedNode[]
}

export class EmptySuggestionGenerator implements SuggestionGenerator {
  constructor() {}
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    return [];
  }
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return [];
  }
}

const CategoryMap = new Map<NodeCategory, Set<string>>();
const AutocompleteFunctionMap = new Map<NodeCategory, Set<SuggestionGenerator>>();

export function registerNodeCateogry(nodeType: string, category: NodeCategory, autocomplete: SuggestionGenerator) {
  if (!CategoryMap.has(category)) {
      CategoryMap.set(category, new Set<string>());
  }
  if (!AutocompleteFunctionMap.has(category)) {
    AutocompleteFunctionMap.set(category, new Set<SuggestionGenerator>());
  }
  CategoryMap.get(category).add(nodeType);
  AutocompleteFunctionMap.get(category).add(autocomplete);
};

export function getNodesForCategory(category: NodeCategory) {
  return CategoryMap.get(category);
}

export function isNodeInCategory(nodeType: string, category: NodeCategory) {
  return CategoryMap.get(category).has(nodeType);
}

export function getAutocompleteFunctionsForCategory(category: NodeCategory) : Set<SuggestionGenerator> {
  if (!AutocompleteFunctionMap.has(category)) {
    return new Set<SuggestionGenerator>();
  }
  return AutocompleteFunctionMap.get(category);
}