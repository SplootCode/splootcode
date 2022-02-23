import {
  ComponentDefinition,
  FunctionDefinition,
  TypeExpression,
  VariableDefinition,
  javascriptBuiltInGlobalFunctions,
  loadTypescriptTypeInfo,
  resolveMethodsFromTypeExpression,
  resolvePropertiesFromTypeExpression,
  typeRegistry,
} from '../definitions/loader'
import { ScopeMutation, ScopeMutationType } from '../mutations/scope_mutations'
import { ScopeObserver } from '../observers'
import { SplootNode } from '../node'
import { globalMutationDispatcher } from '../mutations/mutation_dispatcher'
import { loadPythonBuiltinFunctions } from './python'

function cloneType(type: TypeExpression): TypeExpression {
  return JSON.parse(JSON.stringify(type))
}

function typeUnion(a: TypeExpression, b: TypeExpression): TypeExpression {
  // TODO: Make this smarter.
  if (a.type === 'union') {
    const newType = cloneType(a)
    newType.unionOrIntersectionList.push(b)
    return newType
  }
  if (b.type === 'union') {
    const newType = cloneType(b) // Clone
    newType.unionOrIntersectionList.push(a)
    return newType
  }
  if (a.type === 'object' && b.type === 'object') {
    const newType = cloneType(a) // clone
    for (const prop in b.objectProperties) {
      if (prop in newType) {
        newType.objectProperties[prop] = typeUnion(b.objectProperties[prop], a.objectProperties[prop])
      } else {
        newType.objectProperties[prop] = b.objectProperties[prop]
      }
    }
    return newType
  }
  // Last resort = union.
  const newType: TypeExpression = { type: 'union', unionOrIntersectionList: [cloneType(a), cloneType(b)] }
  return newType
}

export function addPropertyToTypeExpression(originalType: TypeExpression, property: string, type: TypeExpression) {
  originalType = cloneType(originalType)
  if (originalType.type === 'object') {
    // It's already an object type
    if (property in originalType.objectProperties) {
      // Property already here, need to update the type of the property.
      originalType.objectProperties[property] = typeUnion(originalType.objectProperties[property], type)
    } else {
      // Property not already in this object, add it.
      originalType.objectProperties[property] = type
    }
    return originalType
  }
  // It's some pre-defined or union/intersection type. We're now both an object and the other type.
  const objectType: TypeExpression = { type: 'object', objectProperties: { property: type } }
  return typeUnion(originalType, objectType)
}

interface VariableScopeEntry {
  definition: VariableDefinition
  declarers: Set<SplootNode>
  watchers: Set<SplootNode>
}

interface FunctionScopeEntry {
  definition: FunctionDefinition
  declarers: Set<SplootNode>
  watchers: Set<SplootNode>
}

export class Scope {
  parent: Scope
  name: string
  childScopes: Set<Scope>
  nodeType: string
  isGlobal: boolean
  variables: { [key: string]: VariableScopeEntry }
  properties: { [key: string]: VariableDefinition }
  components: { [key: string]: ComponentDefinition }
  functions: { [key: string]: FunctionScopeEntry }
  mutationObservers: ScopeObserver[]

  constructor(parent: Scope, nodeType: string) {
    this.parent = parent
    this.name = ''
    this.childScopes = new Set()
    this.nodeType = nodeType
    this.variables = {}
    this.components = {}
    this.properties = {}
    this.functions = {}
    this.mutationObservers = []
  }

  hasEntries(): boolean {
    return Object.keys(this.variables).length !== 0 || Object.keys(this.functions).length !== 0
  }

  setName(name: string) {
    this.name = name
  }

  addChildScope(nodeType: string): Scope {
    const childScope = new Scope(this, nodeType)
    this.childScopes.add(childScope)
    this.fireMutation({
      type: ScopeMutationType.ADD_CHILD_SCOPE,
      scope: this,
    })
    return childScope
  }

  removeChildScope(scope: Scope) {
    this.childScopes.delete(scope)
    this.fireMutation({
      type: ScopeMutationType.REMOVE_CHILD_SCOPE,
      scope: this,
    })
  }

  fireMutation(mutation: ScopeMutation) {
    this.mutationObservers.forEach((observer: ScopeObserver) => {
      observer.handleScopeMutation(mutation)
    })
    globalMutationDispatcher.handleScopeMutation(mutation)
  }

  addProperty(property: VariableDefinition) {
    // TODO: Check it's not already there?
    this.properties[property.name] = property
  }

  addVariable(variable: VariableDefinition, source?: SplootNode) {
    if (!(variable.name in this.variables)) {
      this.variables[variable.name] = {
        definition: variable,
        declarers: new Set(),
        watchers: new Set(),
      }
    }
    if (source) {
      this.variables[variable.name].declarers.add(source)
    }
    this.fireMutation({
      type: ScopeMutationType.ADD_ENTRY,
      scope: this,
    })
  }

  removeVariable(name: string, source: SplootNode) {
    const entry = this.variables[name]
    entry.declarers.delete(source)
    if (entry.declarers.size === 0) {
      delete this.variables[name]
      this.fireMutation({
        type: ScopeMutationType.REMOVE_ENTRY,
        scope: this,
      })
    }
  }

  addComponent(def: ComponentDefinition) {
    this.components[def.name] = def
  }

  addFunction(func: FunctionDefinition, source?: SplootNode) {
    if (!(func.name in this.functions)) {
      this.functions[func.name] = {
        definition: func,
        declarers: new Set(),
        watchers: new Set(),
      }
    }
    if (source) {
      this.functions[func.name].declarers.add(source)
    }
    this.fireMutation({
      type: ScopeMutationType.ADD_ENTRY,
      scope: this,
    })
  }

  removeFunction(name: string, source: SplootNode) {
    const entry = this.functions[name]
    entry.declarers.delete(source)
    if (entry.declarers.size === 0) {
      delete this.functions[name]
      this.fireMutation({
        type: ScopeMutationType.REMOVE_ENTRY,
        scope: this,
      })
    }
  }

  getAllComponentDefinitions(): ComponentDefinition[] {
    const locals = Object.keys(this.components).map((key) => this.components[key])
    if (this.parent === null) {
      return locals
    }
    return locals.concat(this.parent.getAllComponentDefinitions())
  }

  getAllPropertyDefinitions(): VariableDefinition[] {
    const locals = Object.keys(this.properties).map((key) => this.properties[key])
    if (this.parent === null) {
      return locals
    }
    return locals.concat(this.parent.getAllPropertyDefinitions())
  }

  getAllVariableDefinitions(): VariableDefinition[] {
    const locals = Object.keys(this.variables).map((key) => this.variables[key].definition)
    if (this.parent === null) {
      return locals
    }
    return locals.concat(this.parent.getAllVariableDefinitions())
  }

  getAllFunctionDefinitions(): FunctionDefinition[] {
    const locals = Object.keys(this.functions).map((key) => this.functions[key].definition)
    if (this.parent === null) {
      return locals
    }
    return locals.concat(this.parent.getAllFunctionDefinitions())
  }

  getVariableDefintionByName(name: string): VariableDefinition {
    if (name in this.variables) {
      return this.variables[name].definition
    }
    if (this.isGlobal) {
      return null
    }
    return this.parent.getVariableDefintionByName(name)
  }

  replaceVariableTypeExpression(name: string, newType: TypeExpression) {
    if (name in this.variables) {
      this.variables[name].definition.type = newType
    }
    if (this.isGlobal) {
      return
    }
    this.parent.replaceVariableTypeExpression(name, newType)
  }

  getVariableMembers(name: string): VariableDefinition[] {
    const definition = this.getVariableDefintionByName(name)
    if (!definition) {
      return []
    }
    return resolvePropertiesFromTypeExpression(definition.type)
  }

  getMethods(name: string): FunctionDefinition[] {
    const definition = this.getVariableDefintionByName(name)
    if (!definition) {
      return []
    }
    return resolveMethodsFromTypeExpression(definition.type)
  }

  getFunctionDefinitionByName(name: string): FunctionDefinition {
    if (name in this.functions) {
      return this.functions[name].definition
    }
    if (this.isGlobal) {
      return null
    }
    return this.parent.getFunctionDefinitionByName(name)
  }

  getComponentDefinitionByName(name: string): ComponentDefinition {
    if (name in this.components) {
      return this.components[name]
    }
    if (this.isGlobal) {
      return null
    }
    return this.parent.getComponentDefinitionByName(name)
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
  // Must hardcode this string instead of importing, because of bootstrapping issue.
  if (rootNode.type === 'JAVASCRIPT_FILE') {
    await loadTypescriptTypeInfo()
    const windowType = typeRegistry['Window']
    windowType.properties.forEach((variable: VariableDefinition) => {
      scope.addVariable(variable)
    })
    windowType.methods.forEach((method: FunctionDefinition) => {
      scope.addFunction(method)
    })
    javascriptBuiltInGlobalFunctions.forEach((func: FunctionDefinition) => {
      scope.addFunction(func)
    })
  } else if (rootNode.type === 'PYTHON_FILE') {
    const pythonGlobalFuncs = loadPythonBuiltinFunctions()
    pythonGlobalFuncs.forEach((func) => {
      scope.addFunction(func)
    })
  }
  globalScope = scope
  functionRegistry = {}
  rootNode.recursivelyBuildScope()
  rootNode.recursivelyValidate()
}
