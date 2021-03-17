
import { FunctionDefinition, javascriptBuiltInGlobalFunctions, loadTypescriptTypeInfo, resolveMethodsFromTypeExpression, resolvePropertiesFromTypeExpression, typeRegistry, VariableDefinition } from "../lib/loader";
import { SplootNode } from "../node";

export class Scope {
  parent: Scope;
  id: string;
  isGlobal: boolean;
  variables: {[key:string]: VariableDefinition};
  functions: {[key:string]: FunctionDefinition};

  constructor(parent: Scope) {
    this.parent = parent;
    this.variables = {};
    this.functions = {};
  }

  addVariable(variable: VariableDefinition) {
    // TODO: Check it's not already there?
    this.variables[variable.name] = variable;
  }

  addFunction(func: FunctionDefinition) {
    this.functions[func.name] = func;
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

