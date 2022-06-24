import { ModuleDefinition, TypeCategory, TypeDefinition, VariableTypeInfo } from '@splootcode/core/language/scope/types'
import { PythonAnalyzer } from '../analyzer/python_analyzer'
import { PythonModuleSpec, loadPythonBuiltins, loadPythonModule } from '../scope/python'
import { Scope, VariableScopeEntry } from '@splootcode/core/language/scope/scope'
import { ScopeMutationType } from '@splootcode/core/language/mutations/scope_mutations'
import { SplootNode } from '@splootcode/core/language/node'

function generateRandomID(): string {
  const r = (Math.random() + 1).toString(36).substring(7)
  return r
}

export class PythonScope extends Scope {
  analyzer: PythonAnalyzer
  pythonParent: PythonScope
  functionRegistry: Map<string, SplootNode>

  constructor(parent: Scope, nodeType: string) {
    super(parent, nodeType)
    this.pythonParent = parent as PythonScope
    this.functionRegistry = new Map()
  }

  processPythonModuleSpec(spec: PythonModuleSpec) {
    if (!this.isGlobal) {
      this.pythonParent.processPythonModuleSpec(spec)
      return
    }

    loadPythonModule(this, spec)
  }

  addChildScope(nodeType: string): Scope {
    const childScope = new PythonScope(this, nodeType)
    this.childScopes.add(childScope)
    this.fireMutation({
      type: ScopeMutationType.ADD_CHILD_SCOPE,
      scope: this,
      childScope: childScope,
    })
    return childScope
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

export async function generateScope(rootNode: SplootNode, analyzer: PythonAnalyzer) {
  const scope = new PythonScope(null, null)
  scope.isGlobal = true
  scope.analyzer = analyzer
  const globalScope = scope
  loadPythonBuiltins(scope)
  rootNode.recursivelyBuildScope(globalScope)
}
