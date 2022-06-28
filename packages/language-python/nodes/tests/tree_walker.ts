import { ParseNode, ParseNodeArray, ParseTreeWalker } from 'structured-pyright'

export class TestWalker extends ParseTreeWalker {
  constructor() {
    super()
  }

  override visitNode(node: ParseNode) {
    const children = super.visitNode(node)
    this._verifyParentChildLinks(node, children)

    return children
  }

  // Make sure that all of the children point to their parent.
  private _verifyParentChildLinks(node: ParseNode, children: ParseNodeArray) {
    children.forEach((child) => {
      if (child) {
        if (child.parent !== node) {
          throw new Error(`Child node ${child.nodeType} does not contain a reference to its parent ${node.nodeType}`)
        }
      }
    })
  }
}
