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
import { SplootNode } from '../node'
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

export class Scope {
  parent: Scope
  nodeType: string
  isGlobal: boolean
  variables: { [key: string]: VariableDefinition }
  properties: { [key: string]: VariableDefinition }
  components: { [key: string]: ComponentDefinition }
  functions: { [key: string]: FunctionDefinition }

  constructor(parent: Scope, nodeType: string) {
    this.parent = parent
    this.nodeType = nodeType
    this.variables = {}
    this.components = {}
    this.properties = {}
    this.functions = {}
  }

  addProperty(property: VariableDefinition) {
    // TODO: Check it's not already there?
    this.properties[property.name] = property
  }

  addVariable(variable: VariableDefinition) {
    // TODO: Check it's not already there?
    this.variables[variable.name] = variable
  }

  addComponent(def: ComponentDefinition) {
    this.components[def.name] = def
  }

  addFunction(func: FunctionDefinition) {
    // TODO: Check it's not already there?
    this.functions[func.name] = func
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
    const locals = Object.keys(this.variables).map((key) => this.variables[key])
    if (this.parent === null) {
      return locals
    }
    return locals.concat(this.parent.getAllVariableDefinitions())
  }

  getAllFunctionDefinitions(): FunctionDefinition[] {
    const locals = Object.keys(this.functions).map((key) => this.functions[key])
    if (this.parent === null) {
      return locals
    }
    return locals.concat(this.parent.getAllFunctionDefinitions())
  }

  getVariableDefintionByName(name: string): VariableDefinition {
    if (name in this.variables) {
      return this.variables[name]
    }
    if (this.isGlobal) {
      return null
    }
    return this.parent.getVariableDefintionByName(name)
  }

  replaceVariableTypeExpression(name: string, newType: TypeExpression) {
    if (name in this.variables) {
      this.variables[name].type = newType
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
      return this.functions[name]
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
}
