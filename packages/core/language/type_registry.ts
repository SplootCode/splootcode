import { HighlightColorCategory } from "../colors";
import { SplootNode } from "./node";
import { getNodeCategoriesForType, isNodeInCategory, NodeCategory } from "./node_category_registry";

const typeRegistry : {[key: string]: TypeRegistration} = {};
const pasteAdapaterMapping = {};

export class TypeRegistration {
  typeName: string;
  hasScope: boolean = false;
  properties: string[];
  childSets: {[key: string]: NodeCategory};
  layout: NodeLayout;
  pasteAdapters: {[key: string]: (node: SplootNode) => SplootNode} = {};
  deserializer: (serialisedNode: SerializedNode) => SplootNode;
}

export enum NodeAttachmentLocation {
  SIDE = 0,
  TOP
}

export class NodeLayout {
  color: HighlightColorCategory;
  components: LayoutComponent[];
  small: boolean;

  constructor(color: HighlightColorCategory, layoutComponents: LayoutComponent[], small: boolean = false) {
    this.color = color;
    this.components = layoutComponents;
    this.small = small;
  }
}

export enum LayoutComponentType {
  KEYWORD = 0,
  STRING_LITERAL,
  PROPERTY,
  CHILD_SET_BLOCK,
  CHILD_SET_INLINE,
  CHILD_SET_TREE_BRACKETS,
  CHILD_SET_TREE,
  CHILD_SET_ATTACH_RIGHT,
  CHILD_SET_TOKEN_LIST,
  CHILD_SET_BREADCRUMBS,
}

export class LayoutComponent {
  type: LayoutComponentType;
  identifier: string;
  metadata: any;
  
  constructor(type: LayoutComponentType, identifier: string, metadata?: any) {
    this.type = type;
    this.identifier = identifier;
    this.metadata = metadata;
  }
}

export function registerType(registration : TypeRegistration) {
  typeRegistry[registration.typeName] = registration;
}

export function isScopedNodeType(typeName: string) {
  return typeRegistry[typeName].hasScope;
}

function getChainedPasteAdapter(adapter1 : (node: SplootNode) => SplootNode, adapater2: (node: SplootNode) => SplootNode) : (node: SplootNode) => SplootNode {
  return (node: SplootNode) => {
    let temp = adapter1(node);
    return adapater2(temp);
  }
}

function getAdaptersForType(typeName: string) : {} {
  let typePasteAdapters = typeRegistry[typeName].pasteAdapters;
  let results = {};
  for (let targetTypeName in typePasteAdapters) {
    let targetRegistration = typeRegistry[targetTypeName];
    let targetCategories = getNodeCategoriesForType(targetTypeName);
    targetCategories.forEach(category => {
      results[category] = typePasteAdapters[targetTypeName];
    });
    // Get the adapters for the target type too and add them in wrapped form
    let targetAdapters = getAdaptersForType(targetTypeName);
    for(let targetAdapterCategory in targetAdapters) {
      if (!(targetAdapterCategory in results)) {
        results[targetAdapterCategory] = getChainedPasteAdapter(
          typePasteAdapters[targetTypeName],
          targetAdapters[targetAdapterCategory]
        )
      }
    }
  }
  return results;
}

export function resolvePasteAdapters() {
  // Loop through all registered types
  for (let typeName in typeRegistry) {
    pasteAdapaterMapping[typeName] = getAdaptersForType(typeName);
  }
}

export function adaptNodeToPasteDestination(node: SplootNode, destCategory: NodeCategory) : SplootNode {
  if (!destCategory) {
    return null;
  }
  if (isNodeInCategory(node.type, destCategory)) {
    return node;
  }
  let adapters = pasteAdapaterMapping[node.type];
  if (!(destCategory in adapters)) {
    return null;
  }
  return adapters[destCategory](node);
}

export function getLayout(typeName: string) : NodeLayout {
  let registration = typeRegistry[typeName];
  if (registration) {
    return registration.layout;
  }
  console.warn(`Missing type registration for type ${typeName}`);
  return null;
}

export interface SerializedNode {
  type: string,
  id: string,
  properties: { [key: string]: string },
  childSets: { [key: string]: SerializedNode[] }
}

export function deserializeNode(serialisedNode: SerializedNode) : SplootNode {
  let typeName = serialisedNode.type;
  let registry = typeRegistry[typeName];
  if (!registry) {
    console.warn('Could not find type registration for: ', typeName);
    return null;
  }
  if (!registry.deserializer) {
    console.warn('Missing deserializer for type: ', typeName);
    return null;
  }
  return typeRegistry[typeName].deserializer(serialisedNode);
}
