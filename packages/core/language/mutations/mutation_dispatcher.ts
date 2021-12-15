import { ChildSetMutation } from './child_set_mutations'
import { ChildSetObserver, NodeObserver } from '../observers'
import { NodeMutation } from './node_mutations'

class MutationDispatcher {
  nodeObservers: NodeObserver[]
  childSetObservers: ChildSetObserver[]

  constructor() {
    this.nodeObservers = []
    this.childSetObservers = []
  }

  registerNodeObserver(observer: NodeObserver) {
    this.nodeObservers.push(observer)
  }

  deregisterNodeObserver(observer: NodeObserver) {
    const idx = this.nodeObservers.indexOf(observer)
    if (idx !== -1) {
      this.nodeObservers.splice(idx, 1)
    }
  }

  handleNodeMutation(mutation: NodeMutation) {
    this.nodeObservers.forEach((observer: NodeObserver) => {
      observer.handleNodeMutation(mutation)
    })
  }

  registerChildSetObserver(observer: ChildSetObserver) {
    this.childSetObservers.push(observer)
  }

  deregisterChildSetObserver(observer: ChildSetObserver) {
    const idx = this.childSetObservers.indexOf(observer)
    if (idx !== -1) {
      this.childSetObservers.splice(idx, 1)
    }
  }

  handleChildSetMutation(mutation: ChildSetMutation) {
    this.childSetObservers.forEach((observer: ChildSetObserver) => {
      observer.handleChildSetMutation(mutation)
    })
  }
}

export const globalMutationDispatcher = new MutationDispatcher()
