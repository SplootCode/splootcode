import { ChildSetMutation } from './child_set_mutations'
import { ChildSetObserver, NodeObserver, ScopeObserver } from '../observers'
import { NodeMutation } from './node_mutations'
import { ScopeMutation } from './scope_mutations'

class MutationDispatcher {
  nodeObservers: NodeObserver[]
  childSetObservers: ChildSetObserver[]
  scopeObservers: ScopeObserver[]

  constructor() {
    this.nodeObservers = []
    this.childSetObservers = []
    this.scopeObservers = []
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

  registerScopeObserver(observer: ScopeObserver) {
    this.scopeObservers.push(observer)
  }

  deregisterScopeObserver(observer: ScopeObserver) {
    const idx = this.scopeObservers.indexOf(observer)
    if (idx !== -1) {
      this.scopeObservers.splice(idx, 1)
    }
  }

  handleScopeMutation(mutation: ScopeMutation) {
    this.scopeObservers.forEach((observer: ScopeObserver) => {
      observer.handleScopeMutation(mutation)
    })
  }
}

export const globalMutationDispatcher = new MutationDispatcher()
