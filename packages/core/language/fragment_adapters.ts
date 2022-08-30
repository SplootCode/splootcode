import { ChildSet } from './childset'
import { NodeCategory } from './node_category_registry'
import { SplootFragment } from './fragment'
import { SplootNode } from './node'
import { adaptNodeToPasteDestination, isAdaptableToPasteDesintation } from './type_registry'

type FragmentAapterFunc = (fragment: SplootFragment) => SplootNode
const fragmentAdapaterRegistry: Map<NodeCategory, Map<NodeCategory, FragmentAapterFunc>> = new Map()

export function registerFragmentAdapter(
  fragmentCategory: NodeCategory,
  destCategory: NodeCategory,
  adapterFunc: FragmentAapterFunc
) {
  if (!fragmentAdapaterRegistry.has(fragmentCategory)) {
    fragmentAdapaterRegistry.set(fragmentCategory, new Map())
  }
  fragmentAdapaterRegistry.get(fragmentCategory).set(destCategory, adapterFunc)
}

export function resolveFragmentAdapters() {
  // Follow all the chains and create chained adapters for them
}

export function adaptFragmentToPasteDestinationIfPossible(
  fragment: SplootFragment,
  dest: ChildSet,
  index: number
): SplootNode[] {
  /*
   * Need to make sure:
   * - We don't add multiple expressions to a statement (or otherwise over-fill a node)
   * - We don't break up expression tokens into separate expressions
   * - Fragment might be, itself, invalid (needing cleanup) (e.g. an empty expression in a statement)
   */
  const fragmentCategory = fragment.nodeCategory
  if (!fragmentCategory) {
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

  const adapters = fragmentAdapaterRegistry.get(fragment.nodeCategory)
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
