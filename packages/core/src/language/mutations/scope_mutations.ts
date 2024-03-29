export enum ScopeMutationType {
  ADD_CHILD_SCOPE,
  REMOVE_CHILD_SCOPE,
  ADD_OR_UPDATE_ENTRY,
  REMOVE_ENTRY,
  RENAME_ENTRY,
  IMPORT_MODULE,
}

export type ScopeMutation = ChildScopeScopeMutation | RenameScopeMutation | EntryScopeMutation | ImportModuleMutation

export interface ChildScopeScopeMutation {
  type: ScopeMutationType.ADD_CHILD_SCOPE | ScopeMutationType.REMOVE_CHILD_SCOPE
}

export interface EntryScopeMutation {
  type: ScopeMutationType.ADD_OR_UPDATE_ENTRY | ScopeMutationType.REMOVE_ENTRY
  name: string
}

export interface RenameScopeMutation {
  type: ScopeMutationType.RENAME_ENTRY
  previousName: string
  newName: string
}

export interface ImportModuleMutation {
  type: ScopeMutationType.IMPORT_MODULE
  moduleName: string
}
