import { ChildSetType } from '@splootcode/core'
import { SplootNode } from '@splootcode/core'
import { isNodeInCategory } from '@splootcode/core'

export function deepEquals(node1: SplootNode, node2: SplootNode) {
  expect(node1.type).toEqual(node2.type)
  expect(node1.properties).toEqual(node2.properties)
  for (const childSetID of node1.childSetOrder) {
    const childset1 = node1.getChildSet(childSetID)
    const childset2 = node2.getChildSet(childSetID)
    expect(childset1.getCount()).toEqual(childset2.getCount())
    childset1.children.forEach((child, idx) => {
      deepEquals(child, childset2.getChild(idx))
    })
  }
}

export function nodeSanityCheck(node: SplootNode) {
  expect(node).not.toBeNull()
  for (const childSetID of node.childSetOrder) {
    const childSet = node.getChildSet(childSetID)
    if (childSet.type === ChildSetType.Single) {
      expect(childSet.maxChildren).toEqual(1)
    }
    if (childSet.type === ChildSetType.Immutable) {
      expect(childSet.minChildren).not.toEqual(0)
      expect(childSet.maxChildren).toEqual(childSet.minChildren)
    }
    expect(childSet.getCount()).toBeGreaterThanOrEqual(childSet.minChildren)
    if (childSet.maxChildren !== -1) {
      expect(childSet.getCount()).toBeLessThanOrEqual(childSet.maxChildren)
    }
    childSet.children.forEach((child, idx) => {
      if (!isNodeInCategory(child.type, childSet.nodeCategory)) {
        throw new Error(`Child node type ${child.type} is incompatible with childset ${childSetID} of ${node.type}`)
      }
      nodeSanityCheck(child)
    })
  }
}
