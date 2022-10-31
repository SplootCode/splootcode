import { ModuleDefinition, TypeCategory, TypeDefinition, VariableTypeInfo } from './types'
import { PythonAnalyzer } from '../analyzer/python_analyzer'
import { PythonModuleSpec, loadPythonBuiltins, loadPythonModule } from './python'
import { PythonNode } from '../nodes/python_node'
import { RenameScopeMutation, ScopeMutation, ScopeMutationType } from '@splootcode/core'
import { ScopeObserver } from '@splootcode/core'
import { SplootNode } from '@splootcode/core'
import { globalMutationDispatcher } from '@splootcode/core'

export interface VariableMetadata {
  documentation: string
  typeInfo?: VariableTypeInfo
}

export interface VariableScopeEntry {
  declarers: Map<SplootNode, VariableMetadata>
  builtIn?: VariableMetadata
}

export interface TypeScopeEntry {
  name: string
  module: string
  builtIn?: VariableMetadata
}

function generateRandomID(): string {
  const r = (Math.random() + 1).toString(36).substring(7)
  return r
}

export class PythonScope {
  parent: PythonScope
  name: string
  childScopes: Set<PythonScope>
  nodeType: string
  isGlobal: boolean
  variables: Map<string, VariableScopeEntry>
  modules: Map<string, ModuleDefinition>
  types: Map<string, TypeScopeEntry>
  nameWatchers: Map<string, Set<SplootNode>>
  mutationObservers: ScopeObserver[]
  analyzer: PythonAnalyzer
  pythonParent: PythonScope
  functionRegistry: Map<string, SplootNode>

  constructor(parent: PythonScope, nodeType: string) {
    this.parent = parent
    this.name = ''
    this.childScopes = new Set()
    this.nodeType = nodeType
    this.variables = new Map()
    this.modules = new Map()
    this.types = new Map()
    this.mutationObservers = []
    this.nameWatchers = new Map()
    this.pythonParent = parent as PythonScope
    this.functionRegistry = new Map()
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

  getGlobalScope(): PythonScope {
    if (this.isGlobal) {
      return this
    }
    return this.parent.getGlobalScope()
  }

  removeChildScope(scope: PythonScope) {
    this.childScopes.delete(scope)
    this.fireMutation({
      type: ScopeMutationType.REMOVE_CHILD_SCOPE,
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
          declarers: new Map(),
        })
      }
    }

    // Even if we couldn't find the variable anywhere, we do the rename.
    // This likely renames the variable everywhere except where it's shadowed.
    const mutation: RenameScopeMutation = {
      type: ScopeMutationType.RENAME_ENTRY,
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
        declarers: new Map(),
      })
    }
    if (source) {
      this.variables.get(name).declarers.set(source, meta)
    }
    const mutation: ScopeMutation = {
      type: ScopeMutationType.ADD_OR_UPDATE_ENTRY,
      name: name,
    }
    if (this.nameWatchers.has(name)) {
      for (const node of this.nameWatchers.get(name)) {
        node.handleScopeMutation(mutation)
      }
    }

    this.fireMutation(mutation)
  }

  loadModule(name: string) {
    if (!this.isGlobal) {
      this.parent.loadModule(name)
      return
    }
    if (this.modules.has(name)) {
      return
    }
    this.modules.set(name, { category: TypeCategory.Module, attributes: new Map(), loaded: false })
    this.fireMutation({
      type: ScopeMutationType.IMPORT_MODULE,
      moduleName: name,
    })
  }

  loadAllImportedModules() {
    if (!this.isGlobal) {
      this.parent.loadAllImportedModules()
      return
    }
    for (const [name, def] of this.modules.entries()) {
      if (!def.loaded) {
        this.fireMutation({
          type: ScopeMutationType.IMPORT_MODULE,
          moduleName: name,
        })
      }
    }
  }

  addBuiltIn(name: string, meta: VariableMetadata) {
    if (!this.variables.has(name)) {
      this.variables.set(name, {
        declarers: new Map(),
      })
    }
    this.variables.get(name).builtIn = meta
  }

  addType(name: string, module: string, meta: VariableMetadata) {
    const canonicalName = `${module}.${name}`
    if (!this.types.has(canonicalName)) {
      this.types.set(canonicalName, {
        name: name,
        module: module,
        builtIn: meta,
      })
    }
  }

  addModuleDefinition(moduleName: string, definition: ModuleDefinition) {
    this.modules.set(moduleName, definition)
  }

  getModuleDefinition(moduleName: string): ModuleDefinition {
    if (this.modules.has(moduleName)) {
      return this.modules.get(moduleName)
    }
    if (this.parent) {
      return this.parent.getModuleDefinition(moduleName)
    }
    return null
  }

  getModuleAttributeTypeInfo(moduleName: string, attribute: string): VariableTypeInfo {
    const module = this.getModuleDefinition(moduleName)
    return module.attributes.get(attribute)
  }

  processPythonModuleSpec(spec: PythonModuleSpec) {
    if (!this.isGlobal) {
      this.pythonParent.processPythonModuleSpec(spec)
      return
    }

    loadPythonModule(this, spec)
  }

  addChildScope(nodeType: string): PythonScope {
    const childScope = new PythonScope(this, nodeType)
    this.childScopes.add(childScope)
    this.fireMutation({
      type: ScopeMutationType.ADD_CHILD_SCOPE,
    })
    return childScope
  }

  getTypeDefinition(canonicalName: string): TypeDefinition {
    const entry = this.types.get(canonicalName)
    if (!entry) {
      if (this.isGlobal) {
        return null
      }
      return this.parent.getTypeDefinition(canonicalName)
    }

    const meta = entry.builtIn?.typeInfo
    if (meta && meta.category == TypeCategory.Type) {
      return meta
    }
    return null
  }

  removeVariable(name: string, source: SplootNode) {
    const entry = this.variables.get(name)
    entry.declarers.delete(source)
    if (entry.declarers.size === 0) {
      this.variables.delete(name)
      this.fireMutation({
        type: ScopeMutationType.REMOVE_ENTRY,
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

  getAttributesForName(name: string): [string, VariableTypeInfo][] {
    const scopeEntry = this.getVariableScopeEntryByName(name)
    const attrs = []

    for (const variableMeta of scopeEntry.declarers.values()) {
      if (variableMeta.typeInfo) {
        const typeInfo = variableMeta.typeInfo
        if (typeInfo.category == TypeCategory.Value) {
          if (typeInfo.typeName === 'module') {
            const moduleDef = this.getModuleDefinition(name)
            attrs.push(...moduleDef.attributes.entries())
          } else {
            const typeMeta = this.getTypeDefinition(typeInfo.typeName)
            attrs.push(...typeMeta.attributes.entries())
          }
        }
      }
    }
    return attrs
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

  getAnalyzer(): PythonAnalyzer {
    if (this.isGlobal) {
      return this.analyzer
    }
    return this.pythonParent.getAnalyzer()
  }

  registerFunction(funcNode: SplootNode) {
    const global = this.getGlobalScope() as PythonScope
    const id = generateRandomID()
    global.functionRegistry.set(id, funcNode)
    return id
  }

  getRegisteredFunction(id: string): SplootNode {
    const global = this.getGlobalScope() as PythonScope
    return global.functionRegistry.get(id)
  }

  allRegisteredFunctionIDs(): string[] {
    const global = this.getGlobalScope() as PythonScope
    return [...global.functionRegistry.keys()]
  }
}

export async function generatePythonScope(rootNode: PythonNode, analyzer: PythonAnalyzer) {
  const scope = new PythonScope(null, null)
  scope.isGlobal = true
  scope.analyzer = analyzer
  const globalScope = scope
  loadPythonBuiltins(scope)
  rootNode.recursivelyBuildScope(globalScope)
}
