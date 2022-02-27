import { Scope } from '../scope/scope'

export enum ScopeMutationType {
  ADD_CHILD_SCOPE,
  REMOVE_CHILD_SCOPE,
  ADD_OR_UPDATE_ENTRY,
  REMOVE_ENTRY,
  RENAME_ENTRY,
}

export type ScopeMutation = ChildScopeScopeMutation | RenameScopeMutation | EntryScopeMutation

export interface ChildScopeScopeMutation {
  scope: Scope
  type: ScopeMutationType.ADD_CHILD_SCOPE | ScopeMutationType.REMOVE_CHILD_SCOPE
  childScope: Scope
}

export interface EntryScopeMutation {
  scope: Scope
  type: ScopeMutationType.ADD_OR_UPDATE_ENTRY | ScopeMutationType.REMOVE_ENTRY
  name: string
}

export interface RenameScopeMutation {
  type: ScopeMutationType.RENAME_ENTRY
  scope: Scope
  previousName: string
  newName: string
}
