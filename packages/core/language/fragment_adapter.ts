import { ChildSet } from './childset'
import { NodeCategory, getNodeCategoriesForType } from './node_category_registry'
import {
  PasteNodeAdapter,
  adaptNodeToPasteDestination,
  getPasteNodeAdaptersForType,
  isAdaptableToPasteDesintation,
} from './type_registry'
import { SplootFragment } from './fragment'
import { SplootNode } from './node'

export type PasteFragmentAdapter = (fragment: SplootFragment) => SplootNode

type FragmentAdapterFunc = (fragment: SplootFragment) => SplootNode
const fragmentAdapterRegistry: Map<NodeCategory, Map<string, FragmentAdapterFunc>> = new Map()

const fragmentAdapterMapping: Map<NodeCategory, Map<NodeCategory, PasteFragmentAdapter>> = new Map()

function getChainedPasteFragmentAdapater(
  fragmentAdapater: PasteFragmentAdapter,
  pasteAdapter: PasteNodeAdapter
): PasteFragmentAdapter {
  return (fragment: SplootFragment) => pasteAdapter(fragmentAdapater(fragment))
}

export function registerFragmentAdapter(
  fragmentCategory: NodeCategory,
  destType: string,
  adapterFunc: FragmentAdapterFunc
) {
  if (!fragmentAdapterRegistry.has(fragmentCategory)) {
    fragmentAdapterRegistry.set(fragmentCategory, new Map())
  }
  fragmentAdapterRegistry.get(fragmentCategory).set(destType, adapterFunc)
}

export function resolveFragmentAdapters() {
  // Follow all the chains and create chained adapters for them
  for (const [fragmentCategory, typeMap] of fragmentAdapterRegistry.entries()) {
    if (!fragmentAdapterMapping.has(fragmentCategory)) {
      fragmentAdapterMapping.set(fragmentCategory, new Map())
    }
    const adapterSet = fragmentAdapterMapping.get(fragmentCategory)
    // The dest type is a node type - find all valid categories for that node
    for (const [destNodeType, fragmentAdapater] of typeMap.entries()) {
      const targetCategories = getNodeCategoriesForType(destNodeType)
      for (const targetCategory of targetCategories) {
        if (!adapterSet.has(targetCategory)) {
          adapterSet.set(targetCategory, fragmentAdapater)
        }
        const pasteAdaptersForChaining = getPasteNodeAdaptersForType(destNodeType)
        for (const [category, pasteAdapter] of pasteAdaptersForChaining.entries()) {
          if (!adapterSet.has(category)) {
            adapterSet.set(category, getChainedPasteFragmentAdapater(fragmentAdapater, pasteAdapter))
          }
        }
      }
    }
  }
}

// Warning: It's important that this function only modify the nodes if the nodes are indeed adaptable.
export function adaptFragmentToPasteDestinationIfPossible(
  fragment: SplootFragment,
  dest: ChildSet,
  index: number
): SplootNode[] {
  const fragmentCategory = fragment.nodeCategory
  if (fragment.isEmpty() || !fragmentCategory) {
    return null
  }

  // Only insert if the destination allows insert
  if (!dest.allowInsert()) {
    return null
  }
  const destCategory = dest.nodeCategory

  // e.g If the destination childset is max 1 but the fragment has many nodes.
  // But what if it's expression tokens...
  // I think we need paste adapters for categories.
  const canFitAllChildren = dest.maxChildren == -1 || dest.getCount() + fragment.nodes.length < dest.maxChildren
  // If the categories match (e.g. expression tokens in an expression token childset)
  // AND the destination can fit them
  if (fragmentCategory === destCategory && canFitAllChildren) {
    return fragment.nodes
  }

  // Fragment adapters will always return only 1 node. If the dest is insertable at all, it'll be ok.
  const adapters = fragmentAdapterMapping.get(fragment.nodeCategory)
  if (adapters && adapters.has(destCategory)) {
    return [adapters.get(destCategory)(fragment)]
  }

  if (canFitAllChildren) {
    const valid = fragment.nodes.filter((node) => isAdaptableToPasteDesintation(node, destCategory))
    if (fragment.nodes.length == valid.length) {
      const adaptedNodes = fragment.nodes.map((node) => {
        const adaptedNode = adaptNodeToPasteDestination(node, destCategory)
        // Need to clean here so that empty expressions get removed from statement nodes.
        adaptedNode.clean()
        return adaptedNode
      })
      return adaptedNodes
    }
  }

  return null
}
