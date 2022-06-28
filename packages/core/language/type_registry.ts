import { HighlightColorCategory } from '../colors'
import { NodeCategory, getNodeCategoriesForType, isNodeInCategory } from './node_category_registry'
import { SplootNode } from './node'

const typeRegistry: { [key: string]: TypeRegistration } = {}
const pasteAdapaterMapping = {}

export class TypeRegistration {
  typeName: string
  hasScope = false
  properties: string[]
  childSets: { [key: string]: NodeCategory }
  layout: NodeLayout
  pasteAdapters: { [key: string]: (node: SplootNode) => SplootNode } = {}
  deserializer: (serialisedNode: SerializedNode) => SplootNode
}

export enum NodeAttachmentLocation {
  SIDE = 0,
  TOP,
}

export enum NodeBoxType {
  STANDARD_BLOCK = 0,
  SMALL_BLOCK,
  INVISIBLE,
  BRACKETS,
}

export class NodeLayout {
  color: HighlightColorCategory
  components: LayoutComponent[]
  boxType: NodeBoxType

  constructor(
    color: HighlightColorCategory,
    layoutComponents: LayoutComponent[],
    boxType: NodeBoxType = NodeBoxType.STANDARD_BLOCK
  ) {
    this.color = color
    this.components = layoutComponents
    this.boxType = boxType
  }
}

export enum LayoutComponentType {
  KEYWORD = 0,
  STRING_LITERAL,
  PROPERTY,
  SEPARATOR,
  CAP,
  CHILD_SET_BLOCK,
  CHILD_SET_TREE_BRACKETS,
  CHILD_SET_TREE,
  CHILD_SET_ATTACH_RIGHT,
  CHILD_SET_TOKEN_LIST,
  CHILD_SET_BREADCRUMBS,
  CHILD_SET_STACK,
}

export class LayoutComponent {
  type: LayoutComponentType
  identifier: string
  labels: string[]
  metadata: any

  constructor(type: LayoutComponentType, identifier: string, labels?: string[], metadata?: any) {
    this.type = type
    this.identifier = identifier
    this.labels = labels
    this.metadata = metadata
  }
}

export function registerType(registration: TypeRegistration) {
  typeRegistry[registration.typeName] = registration
}

export function isScopedNodeType(typeName: string) {
  return typeRegistry[typeName].hasScope
}

function getChainedPasteAdapter(
  adapter1: (node: SplootNode) => SplootNode,
  adapater2: (node: SplootNode) => SplootNode
): (node: SplootNode) => SplootNode {
  return (node: SplootNode) => {
    const temp = adapter1(node)
    return adapater2(temp)
  }
}

function getAdaptersForType(typeName: string): { [key: number]: (node: SplootNode) => SplootNode } {
  const typePasteAdapters = typeRegistry[typeName].pasteAdapters
  const results: { [key: number]: (node: SplootNode) => SplootNode } = {}
  for (const targetTypeName in typePasteAdapters) {
    const targetCategories = getNodeCategoriesForType(targetTypeName)
    targetCategories.forEach((category) => {
      results[category] = typePasteAdapters[targetTypeName]
    })
    // Get the adapters for the target type too and add them in wrapped form
    const targetAdapters = getAdaptersForType(targetTypeName)
    for (const targetAdapterCategory in targetAdapters) {
      if (!(targetAdapterCategory in results)) {
        results[targetAdapterCategory] = getChainedPasteAdapter(
          typePasteAdapters[targetTypeName],
          targetAdapters[targetAdapterCategory]
        )
      }
    }
  }
  return results
}

export function resolvePasteAdapters() {
  // Loop through all registered types
  for (const typeName in typeRegistry) {
    pasteAdapaterMapping[typeName] = getAdaptersForType(typeName)
  }
}

export function isAdaptableToPasteDesintation(node: SplootNode, destCategory: NodeCategory): boolean {
  if (!destCategory) {
    return false
  }
  if (isNodeInCategory(node.type, destCategory)) {
    return true
  }
  const adapters = pasteAdapaterMapping[node.type]
  if (destCategory in adapters) {
    return true
  }
  return false
}

export function adaptNodeToPasteDestination(node: SplootNode, destCategory: NodeCategory): SplootNode {
  if (!destCategory) {
    return null
  }
  if (isNodeInCategory(node.type, destCategory)) {
    return node
  }
  const adapters = pasteAdapaterMapping[node.type]
  if (!(destCategory in adapters)) {
    return null
  }
  return adapters[destCategory](node)
}

export function getLayout(typeName: string): NodeLayout {
  const registration = typeRegistry[typeName]
  if (registration) {
    return registration.layout
  }
  console.warn(`Missing type registration for type ${typeName}`)
  return null
}

export interface SerializedNode {
  type: string
  properties: { [key: string]: string }
  childSets: { [key: string]: SerializedNode[] }
  meta?: { [key: string]: any }
}

export class DeserializationError extends Error {
  nodeType: string

  constructor(nodeType: string, message: string) {
    super(`Failed to deserialize node type: ${nodeType}. Reason: ${message}`)
    this.nodeType = nodeType
  }
}

export function deserializeNode(serialisedNode: SerializedNode): SplootNode {
  const typeName = serialisedNode.type
  const registry = typeRegistry[typeName]
  if (!registry) {
    throw new DeserializationError(typeName, `No type registration found.`)
  }
  if (!registry.deserializer) {
    throw new DeserializationError(typeName, `Type is registered but does not have a deserializer function.`)
  }
  const node = typeRegistry[typeName].deserializer(serialisedNode)
  if (!node) {
    throw new DeserializationError(typeName, `Deserializer function returned an invalid result: ${node}`)
  }
  return node
}
