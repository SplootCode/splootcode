
import { ComponentDefinition, FunctionDefinition, javascriptBuiltInGlobalFunctions, loadTypescriptTypeInfo, resolveMethodsFromTypeExpression, resolvePropertiesFromTypeExpression, typeRegistry, VariableDefinition } from "../lib/loader";
import { SplootNode } from "../node";

export class Scope {
  parent: Scope;
  id: string;
  isGlobal: boolean;
  variables: {[key:string]: VariableDefinition};
  properties: {[key:string]: VariableDefinition};
  components: {[key:string]: ComponentDefinition};
  functions: {[key:string]: FunctionDefinition};

  constructor(parent: Scope) {
    this.parent = parent;
    this.variables = {};
    this.components = {};
    this.properties = {};
    this.functions = {};
  }

  addProperty(property: VariableDefinition) {
    // TODO: Check it's not already there?
    this.properties[property.name] = property;
  }

  addVariable(variable: VariableDefinition) {
    // TODO: Check it's not already there?
    this.variables[variable.name] = variable;
  }

  addComponent(def: ComponentDefinition) {
    this.components[def.name] = def;
  }

  addFunction(func: FunctionDefinition) {
    // TODO: Check it's not already there?
    this.functions[func.name] = func;
  }

  getAllComponentDefinitions(): ComponentDefinition[] {
    let locals = Object.keys(this.components).map(key => this.components[key]);
    if (this.parent === null) {
      return locals;
    }
    return locals.concat(this.parent.getAllComponentDefinitions());
  }

  getAllPropertyDefinitions(): VariableDefinition[] {
    let locals = Object.keys(this.properties).map(key => this.properties[key]);
    if (this.parent === null) {
      return locals;
    }
    return locals.concat(this.parent.getAllPropertyDefinitions());
  }

  getAllVariableDefinitions() : VariableDefinition[] {
    let locals = Object.keys(this.variables).map(key => this.variables[key]);
    if (this.parent === null) {
      return locals;
    }
    return locals.concat(this.parent.getAllVariableDefinitions());
  }

  getAllFunctionDefinitions() : FunctionDefinition[] {
    let locals = Object.keys(this.functions).map(key => this.functions[key]);
    if (this.parent === null) {
      return locals;
    }
    return locals.concat(this.parent.getAllFunctionDefinitions());
  }

  getVariableDefintionByName(name: string): VariableDefinition {
    if (name in this.variables) {
      return this.variables[name];
    }
    if (this.isGlobal) {
      return;
    }
    return this.parent.getVariableDefintionByName(name);
  }

  getVariableMembers(name: string) : VariableDefinition[] {
    let definition = this.getVariableDefintionByName(name);
    if (!definition) {
      return [];
    }
    return resolvePropertiesFromTypeExpression(definition.type);
  }

  getMethods(name: string) : FunctionDefinition[] {
    let definition = this.getVariableDefintionByName(name);
    if (!definition) {
      return [];
    }
    return resolveMethodsFromTypeExpression(definition.type);
  }

  getFunctionDefinitionByName(name: string): FunctionDefinition {
    if (name in this.functions) {
      return this.functions[name];
    }
    if (this.isGlobal) {
      return;
    }
    return this.parent.getFunctionDefinitionByName(name);
  }

  getComponentDefinitionByName(name: string): ComponentDefinition {
    if (name in this.components) {
      return this.components[name];
    }
    if (this.isGlobal) {
      return;
    }
    return this.parent.getComponentDefinitionByName(name);
  }
}

let globalScope;

export function getGlobalScope() : Scope {
  return globalScope;
}

export async function generateScope(rootNode: SplootNode) {
  await loadTypescriptTypeInfo();
  let scope = new Scope(null);
  scope.id = "global";
  scope.isGlobal = true;
  let windowType = typeRegistry['Window'];
  windowType.properties.forEach((variable : VariableDefinition) => {
    scope.addVariable(variable);
  });
  windowType.methods.forEach((method : FunctionDefinition) => {
    scope.addFunction(method);
  });
  javascriptBuiltInGlobalFunctions.forEach((func : FunctionDefinition) => {
    scope.addFunction(func);
  })
  globalScope = scope;
  rootNode.recursivelyBuildScope();
}

