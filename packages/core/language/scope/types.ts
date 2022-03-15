export enum TypeCategory {
  Value,
  Function,
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
}

export type VariableTypeInfo = ValueType | FunctionSignature
