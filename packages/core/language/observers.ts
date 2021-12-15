import { ChildSetMutation } from './mutations/child_set_mutations'
import { NodeMutation } from './mutations/node_mutations'

export interface NodeObserver {
  handleNodeMutation(nodeMutation: NodeMutation): void
}

export interface ChildSetObserver {
  handleChildSetMutation(mutations: ChildSetMutation): void
}
