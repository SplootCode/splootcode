export enum TypeCategory {
  Value,
  Function,
  Type,
  Module,
  ModuleAttribute,
}

interface ValueType {
  category: TypeCategory.Value
  typeName: string
  shortDoc?: string
}

export enum FunctionArgType {
  PositionalOnly,
  PositionalOrKeyword,
  Vargs,
  KeywordOnly,
  Kwargs,
}

export interface FunctionArgument {
  name: string
  type: FunctionArgType
  defaultValue?: string
}

export interface FunctionSignature {
  category: TypeCategory.Function
  arguments: FunctionArgument[]
  shortDoc: string
}

export interface TypeDefinition {
  category: TypeCategory.Type
  attributes: Map<string, VariableTypeInfo>
}

export interface ModuleDefinition {
  category: TypeCategory.Module
  attributes: Map<string, VariableTypeInfo>
}

export interface ModuleAttribute {
  category: TypeCategory.ModuleAttribute
  module: string
  attribute: string
}

export type VariableTypeInfo = ValueType | FunctionSignature | TypeDefinition | ModuleDefinition | ModuleAttribute
