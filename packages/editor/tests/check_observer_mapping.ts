import { ChildSet } from '@splootcode/core/language/childset'
import { SplootNode } from '@splootcode/core/language/node'

export function checkNodeObserversRecursively(splootNode: SplootNode) {
  const observers = splootNode.mutationObservers
  if (observers.length !== 1) {
    throw new Error(`${splootNode.type} node has ${observers.length} observers. Expected 1`)
  }

  splootNode.childSetOrder.forEach((childSetID) => {
    const childSet = splootNode.getChildSet(childSetID)
    checkChildSetObserversRecursively(childSet)
  })
}

function checkChildSetObserversRecursively(childSet: ChildSet) {
  const observers = childSet.mutationObservers
  if (observers.length !== 1) {
    throw new Error(`ChildSet ${childSet.getParentRef()} has ${observers.length} observers. Expected 1`)
  }

  childSet.children.forEach((childNode) => {
    checkNodeObserversRecursively(childNode)
  })
}
