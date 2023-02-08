import { ChildSetMutation } from './mutations/child_set_mutations'
import { NodeMutation } from './mutations/node_mutations'
import { ProjectMutation } from './mutations/project_mutations'
import { ScopeMutation } from './mutations/scope_mutations'

export interface NodeObserver {
  handleNodeMutation(nodeMutation: NodeMutation): void
}

export interface ChildSetObserver {
  handleChildSetMutation(mutations: ChildSetMutation): void
}

export interface ScopeObserver {
  handleScopeMutation(mutation: ScopeMutation): void
}

export interface ProjectObserver {
  handleProjectMutation(mutation: ProjectMutation): void
}
