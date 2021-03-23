import { FunctionDeclaration } from "../types/js/functions";

export interface FunctionTypeDefinition {
  parameters: VariableDefinition[];
  returnType: TypeExpression;
}

export interface FunctionDefinition {
  name: string;
  deprecated: boolean;
  documentation?: string;
  type: FunctionTypeDefinition;
}

export interface ComponentDefinition {
  name: string;
  deprecated: boolean;
  documentation?: string;
  proptypes: VariableDefinition[];
}

export interface VariableDefinition {
  name: string;
  type: TypeExpression;
  deprecated: boolean;
  documentation?: string;
}

export interface TypeDefinition {
  name?: string;
  documentation?: string;
  constructorParams?: VariableDefinition[];
  properties: VariableDefinition[];
  methods: FunctionDefinition[];
}

export interface TypeExpression {
  type: "any" | "null" | "void" | "this" | "unknown" | "undefined" | "union" | "intersection" | "literal" | "reference" | "function" | "object" | "array";
  unionOrIntersectionList?: TypeExpression[];
  literal?: number | string | boolean;
  reference?: string;
  function?: FunctionTypeDefinition;
}

export interface TypeAlias {
  name: string;
  typeExpression: TypeExpression;
}

export let typeRegistry : {[key:string]: TypeDefinition} = {};
export let typeAliasRegistry : {[key:string]: TypeAlias} = {};
export let javascriptBuiltInGlobals : VariableDefinition[] = [];
export let javascriptBuiltInGlobalFunctions: FunctionDefinition[] = [];

export function resolvePropertiesFromTypeExpression(typeExpression: TypeExpression) : VariableDefinition[] {
  let members : VariableDefinition[] = [];

  switch (typeExpression.type) {
    case "reference":
      if (typeExpression.reference in typeRegistry) {
        return typeRegistry[typeExpression.reference].properties;
      }
      if (typeExpression.reference in typeAliasRegistry) {
        return resolvePropertiesFromTypeExpression(typeAliasRegistry[typeExpression.reference].typeExpression);
      }
    case "intersection":
    case "union":
    case "literal":
  }
  return members;
}

export function resolveMethodsFromTypeExpression(typeExpression: TypeExpression) : FunctionDefinition[] {
  let members : FunctionDefinition[] = [];

  switch (typeExpression.type) {
    case "reference":
      if (typeExpression.reference in typeRegistry) {
        return typeRegistry[typeExpression.reference].methods;
      }
      if (typeExpression.reference in typeAliasRegistry) {
        return resolveMethodsFromTypeExpression(typeAliasRegistry[typeExpression.reference].typeExpression);
      }
    case "intersection":
    case "union":
    case "literal":
  }
  return members;
}



/** Populates the type registry and global vars */
export async function loadTypescriptTypeInfo() {

  let a = fetch('/static/generated/ts_global_variables.json')
    .then(response => {
      return response.json();
    })
    .then((payload: VariableDefinition[]) => {
      javascriptBuiltInGlobals = payload;
    })

  let d = fetch('/static/generated/ts_global_functions.json')
    .then(response => {
      return response.json();
    })
    .then((payload: FunctionDefinition[]) => {
      javascriptBuiltInGlobalFunctions = payload;
    })

  let b = fetch('/static/generated/ts_types.json')
    .then(response => {
      return response.json();
    })
    .then((payload: TypeDefinition[]) => {
      payload.forEach((typeDec: TypeDefinition) => {
        typeRegistry[typeDec.name] = typeDec;
      });
    });

  let c = fetch('/static/generated/ts_type_aliases.json')
    .then(response => {
      return response.json();
    })
    .then((payload: TypeAlias[]) => {
      payload.forEach((typeAlias: TypeAlias) => {
        typeAliasRegistry[typeAlias.name] = typeAlias;
      });
    });
  
  await Promise.all([a, b, c]);
}