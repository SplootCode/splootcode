import { HighlightColorCategory } from '../colors'
import { NodeCategory, getNodeCategoriesForType, isNodeInCategory } from './node_category_registry'
import { SplootNode } from './node'
import { resolveFragmentAdapters } from './fragment_adapter'

export type PasteNodeAdapter = (node: SplootNode) => SplootNode

const typeRegistry: { [key: string]: TypeRegistration } = {}
const pasteAdapaterMapping: { [key: string]: Map<NodeCategory, PasteNodeAdapter> } = {}

export class TypeRegistration {
  typeName: string
  hasScope = false
  properties: string[]
  childSets: { [key: string]: NodeCategory }
  layout: NodeLayout
  pasteAdapters: { [key: string]: PasteNodeAdapter } = {}
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
  STRING,
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

  isInvisible(): boolean {
    return (
      this.boxType === NodeBoxType.INVISIBLE &&
      this.components.length === 1 &&
      this.components[0].type !== LayoutComponentType.SEPARATOR
    )
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
  CHILD_SET_BEFORE_STACK,
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

function getChainedPasteAdapter(adapter1: PasteNodeAdapter, adapater2: PasteNodeAdapter): PasteNodeAdapter {
  return (node: SplootNode) => {
    const temp = adapter1(node)
    return adapater2(temp)
  }
}

function getAdaptersForType(typeName: string, excludeTypes: string[]): Map<NodeCategory, PasteNodeAdapter> {
  const typePasteAdapters = typeRegistry[typeName].pasteAdapters
  const results: Map<NodeCategory, PasteNodeAdapter> = new Map()
  for (const targetTypeName in typePasteAdapters) {
    if (excludeTypes.includes(targetTypeName)) {
      continue
    }
    const targetCategories = getNodeCategoriesForType(targetTypeName)
    targetCategories.forEach((category) => {
      results.set(category, typePasteAdapters[targetTypeName])
    })
    // Get the adapters for the target type too and add them in wrapped form
    const targetAdapters = getAdaptersForType(targetTypeName, [typeName, ...excludeTypes])
    for (const targetAdapterCategory of targetAdapters.keys()) {
      if (!results.has(targetAdapterCategory)) {
        results.set(
          targetAdapterCategory,
          getChainedPasteAdapter(typePasteAdapters[targetTypeName], targetAdapters.get(targetAdapterCategory))
        )
      }
    }
  }
  return results
}

export function resolvePasteAdapters() {
  // Loop through all registered types
  for (const typeName in typeRegistry) {
    pasteAdapaterMapping[typeName] = getAdaptersForType(typeName, [typeName])
  }
  // Once the paste adapaters are done, we can resolve the fragment adapters
  resolveFragmentAdapters()
}

export function isAdaptableToPasteDesintation(node: SplootNode, destCategory: NodeCategory): boolean {
  if (!destCategory) {
    return false
  }
  if (isNodeInCategory(node.type, destCategory)) {
    return true
  }
  const adapters = pasteAdapaterMapping[node.type]
  if (adapters.has(destCategory)) {
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
  if (!adapters.has(destCategory)) {
    return null
  }
  return adapters.get(destCategory)(node)
}

export function getPasteNodeAdaptersForType(nodeType: string): Map<NodeCategory, PasteNodeAdapter> {
  return pasteAdapaterMapping[nodeType]
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
  matchingID?: string
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
