import { NodeMutation, NodeMutationType } from '../mutations/node_mutations'
import { NodeObserver } from '../observers'
import { SplootNode } from '../node'
import { globalMutationDispatcher } from '../mutations/mutation_dispatcher'

export class ValidationWatcher implements NodeObserver {
  private invalidNodes: Set<SplootNode>

  constructor() {
    this.invalidNodes = new Set()
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    if (nodeMutation.type === NodeMutationType.SET_VALIDITY) {
      if (nodeMutation.validity.valid) {
        this.invalidNodes.delete(nodeMutation.node)
      } else {
        this.invalidNodes.add(nodeMutation.node)
      }
    }
  }

  isValid(): boolean {
    return this.invalidNodes.size === 0
  }

  registerSelf() {
    globalMutationDispatcher.registerNodeObserver(this)
  }

  deregisterSelf() {
    globalMutationDispatcher.deregisterNodeObserver(this)
  }
}
