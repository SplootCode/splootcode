import { ChildSetLayoutHandler } from './childset_layout_handler'
import { LayoutComponent, LayoutComponentType } from '@splootcode/core/language/type_registry'
import { NodeBlock } from './rendered_node'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { StackLayoutHandler } from './stack_layout_handler'
import { TokenLayoutHandler } from './token_layout_handler'
import { TreeLayoutHandler } from './tree_layout_handler'
import { getLayoutComponentForCategory } from '@splootcode/core/language/node_category_registry'

export class RenderedFragment {
  fragment: SplootFragment
  nodes: NodeBlock[]

  x: number
  y: number
  height: number
  width: number
  translateX: number
  translateY: number

  layoutHandler: ChildSetLayoutHandler

  constructor(splootFragment: SplootFragment, includeBlock = true) {
    this.fragment = splootFragment
    this.x = 0
    this.y = 0
    this.translateX = 0
    this.translateY = 0

    this.nodes = splootFragment.nodes.map((node, idx) => {
      return new NodeBlock(null, node, null, idx)
    })

    if (this.nodes.length !== 1) {
      const layoutType = getLayoutComponentForCategory(splootFragment.nodeCategory)

      switch (layoutType) {
        case LayoutComponentType.CHILD_SET_BLOCK:
        case LayoutComponentType.CHILD_SET_STACK:
          this.layoutHandler = new StackLayoutHandler()
          break
        case LayoutComponentType.CHILD_SET_TOKEN_LIST:
        case LayoutComponentType.CHILD_SET_ATTACH_RIGHT:
          this.layoutHandler = new TokenLayoutHandler()
          break
        case LayoutComponentType.CHILD_SET_TREE:
        case LayoutComponentType.CHILD_SET_TREE_BRACKETS:
          const layoutComponent = new LayoutComponent(layoutType, 'fragment', [])
          this.layoutHandler = new TreeLayoutHandler(layoutComponent)
          break
        default:
          console.warn(`Unsupported childset layout type: ${layoutType}`)
      }

      this.layoutHandler.calculateDimensions(0, 0, this.nodes, null, false, -1, 0, true)
      this.height = this.layoutHandler.height
      this.width = this.layoutHandler.width
    } else {
      const singleNode = this.nodes[0]
      singleNode.calculateDimensions(0, 0, null)
      this.translateX = -singleNode.marginLeft
      this.translateY = -singleNode.marginTop
      this.height = singleNode.rowHeight - singleNode.marginTop + (includeBlock ? singleNode.indentedBlockHeight : 0)
      this.width = (includeBlock ? singleNode.width : singleNode.rowWidth) - singleNode.marginLeft
    }
  }
}
