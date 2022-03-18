export enum TypeCategory {
  Value,
  Function,
  Type,
}

interface ValueType {
  category: TypeCategory.Value
  typeName: string
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

export type VariableTypeInfo = ValueType | FunctionSignature | TypeDefinition
