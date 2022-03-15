import { RenameScopeMutation, ScopeMutation, ScopeMutationType } from '../mutations/scope_mutations'
import { ScopeObserver } from '../observers'
import { SplootNode } from '../node'
import { VariableTypeInfo } from './types'
import { globalMutationDispatcher } from '../mutations/mutation_dispatcher'
import { loadPythonBuiltinFunctions } from './python'

export interface VariableMetadata {
  documentation: string
  typeInfo?: VariableTypeInfo
}

interface VariableScopeEntry {
  detectedTypes: VariableTypeInfo[]
  declarers: Map<SplootNode, VariableMetadata>
  builtIn?: VariableMetadata
}

export class Scope {
  parent: Scope
  name: string
  childScopes: Set<Scope>
  nodeType: string
  isGlobal: boolean
  variables: Map<string, VariableScopeEntry>
  nameWatchers: Map<string, Set<SplootNode>>
  mutationObservers: ScopeObserver[]

  constructor(parent: Scope, nodeType: string) {
    this.parent = parent
    this.name = ''
    this.childScopes = new Set()
    this.nodeType = nodeType
    this.variables = new Map()
    this.mutationObservers = []
    this.nameWatchers = new Map()
  }

  hasEntries(): boolean {
    return this.variables.size !== 0
  }

  setName(name: string) {
    this.name = name
  }

  addWatcher(name: string, node: SplootNode) {
    if (!this.nameWatchers.has(name)) {
      this.nameWatchers.set(name, new Set<SplootNode>())
    }
    this.nameWatchers.get(name).add(node)
  }

  removeWatcher(name: string, node: SplootNode) {
    this.nameWatchers.get(name).delete(node)
  }

  addChildScope(nodeType: string): Scope {
    const childScope = new Scope(this, nodeType)
    this.childScopes.add(childScope)
    this.fireMutation({
      type: ScopeMutationType.ADD_CHILD_SCOPE,
      scope: this,
      childScope: childScope,
    })
    return childScope
  }

  removeChildScope(scope: Scope) {
    this.childScopes.delete(scope)
    this.fireMutation({
      type: ScopeMutationType.REMOVE_CHILD_SCOPE,
      scope: this,
      childScope: scope,
    })
  }

  fireMutation(mutation: ScopeMutation) {
    this.mutationObservers.forEach((observer: ScopeObserver) => {
      observer.handleScopeMutation(mutation)
    })
    globalMutationDispatcher.handleScopeMutation(mutation)
  }

  canRename(name: string): boolean {
    if (this.isGlobal) {
      // Can't rename globals, but if it's not found at all then allow it.
      return !this.variables.has(name)
    }
    if (this.variables.has(name)) {
      // TODO: some things can't be renamed like module names
      // so we need to check this.
      return true
    }
    return this.parent.canRename(name)
  }

  renameIdentifier(oldName: string, newName: string) {
    if (oldName === newName) {
      return
    }
    if (!this.variables.has(oldName)) {
      if (this.parent) {
        this.parent.renameIdentifier(oldName, newName)
        return
      }
    } else {
      if (this.isGlobal) {
        // Can't rename globals
        return
      }
      // TODO: What if already there? I guess we just combine them
      if (this.variables.has(newName)) {
        // Already exists
        console.warn('Attempting to rename to variable that already exists in this scope.')
      } else {
        // Leave it up to the declarers to remove themselves from the old name and add the new name.
        this.variables.set(newName, {
          detectedTypes: this.variables.get(oldName).detectedTypes,
          declarers: new Map(),
        })
      }
    }

    // Even if we couldn't find the variable anywhere, we do the rename.
    // This likely renames the variable everywhere except where it's shadowed.
    const mutation: RenameScopeMutation = {
      type: ScopeMutationType.RENAME_ENTRY,
      scope: this,
      newName: newName,
      previousName: oldName,
    }
    for (const childScope of this.childScopes) {
      childScope.propagateRename(oldName, newName, mutation)
    }
    if (this.nameWatchers.has(oldName)) {
      for (const node of this.nameWatchers.get(oldName)) {
        node.handleScopeMutation(mutation)
        this.addWatcher(newName, node)
        this.nameWatchers.get(oldName).delete(node)
      }
    }
    this.fireMutation(mutation)
  }

  propagateRename(oldName: string, newName: string, mutation: RenameScopeMutation) {
    if (this.variables.has(oldName)) {
      // We have a shadow of that name so whatevs.
      return
    }
    for (const childScope of this.childScopes) {
      childScope.propagateRename(oldName, newName, mutation)
    }
    if (this.nameWatchers.has(oldName)) {
      for (const node of this.nameWatchers.get(oldName)) {
        node.handleScopeMutation(mutation)
        this.addWatcher(newName, node)
        this.nameWatchers.get(oldName).delete(node)
      }
    }
  }

  addVariable(name: string, meta: VariableMetadata, source?: SplootNode) {
    if (!this.variables.has(name)) {
      this.variables.set(name, {
        detectedTypes: [],
        declarers: new Map(),
      })
    }
    if (source) {
      this.variables.get(name).declarers.set(source, meta)
    }
    const mutation: ScopeMutation = {
      type: ScopeMutationType.ADD_OR_UPDATE_ENTRY,
      scope: this,
      name: name,
    }
    if (this.nameWatchers.has(name)) {
      for (const node of this.nameWatchers.get(name)) {
        node.handleScopeMutation(mutation)
      }
    }

    this.fireMutation(mutation)
  }

  addBuiltIn(name: string, meta: VariableMetadata) {
    if (!this.variables.has(name)) {
      this.variables.set(name, {
        detectedTypes: [],
        declarers: new Map(),
      })
    }
    this.variables.get(name).builtIn = meta
  }

  removeVariable(name: string, source: SplootNode) {
    const entry = this.variables.get(name)
    entry.declarers.delete(source)
    if (entry.declarers.size === 0) {
      this.variables.delete(name)
      this.fireMutation({
        type: ScopeMutationType.REMOVE_ENTRY,
        scope: this,
        name: name,
      })
    }
  }

  getAllInScopeVariables(): Map<string, VariableScopeEntry> {
    if (this.parent === null) {
      return new Map(this.variables)
    }

    const flattendScope = this.parent.getAllInScopeVariables()
    for (const [name, value] of this.variables.entries()) {
      flattendScope.set(name, value)
    }
    return flattendScope
  }

  getVariableScopeEntryByName(name: string): VariableScopeEntry {
    if (this.variables.has(name)) {
      return this.variables.get(name)
    }
    if (this.isGlobal) {
      return null
    }
    return this.parent.getVariableScopeEntryByName(name)
  }

  isInside(nodeType: string): boolean {
    if (this.isGlobal) {
      return false
    }
    if (this.nodeType === nodeType) {
      return true
    }
    return this.parent.isInside(nodeType)
  }
}

function generateRandomID(): string {
  const r = (Math.random() + 1).toString(36).substring(7)
  return r
}

export function registerFunction(funcNode: SplootNode) {
  const id = generateRandomID()
  functionRegistry[id] = funcNode
  return id
}

export function getRegisteredFunction(id: string): SplootNode {
  return functionRegistry[id]
}

export function allRegisteredFunctionIDs(): string[] {
  return Object.keys(functionRegistry)
}

let globalScope
let functionRegistry

export function getGlobalScope(): Scope {
  return globalScope
}

export async function generateScope(rootNode: SplootNode) {
  const scope = new Scope(null, null)
  scope.isGlobal = true
  globalScope = scope
  functionRegistry = {}
  if (rootNode.type === 'PYTHON_FILE') {
    loadPythonBuiltinFunctions(scope)
  }
  rootNode.recursivelyBuildScope()
  rootNode.recursivelyValidate()
}
