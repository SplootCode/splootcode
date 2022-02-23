import { Scope } from '../scope/scope'

export enum ScopeMutationType {
  ADD_CHILD_SCOPE,
  REMOVE_CHILD_SCOPE,
  ADD_ENTRY,
  REMOVE_ENTRY,
  RENAME_ENTRY,
}

export class ScopeMutation {
  scope: Scope
  type: ScopeMutationType
}
