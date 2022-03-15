import * as builtins from '../../generated/python_builtins.json'
import { FunctionArgType, FunctionArgument, TypeCategory, VariableTypeInfo } from './types'
import { Scope } from './scope'

interface VariableSpec {
  name: string
  typeName: string
  typeModule: string
  isClass: boolean
  isCallable: boolean
  isModule: boolean
  doc: string
  shortDoc: string
  parameters?: { name: string; kind: string; default?: string }[]
}

interface PythonModuleSpec {
  moduleName: string
  values: { [key: string]: VariableSpec }
}

// const functions: FunctionDefinition[] = [
//   {
//     name: 'print',
//     deprecated: false,
//     type: { parameters: [], returnType: { type: 'void' } },
//     documentation: 'Outputs information to the terminal',
//   },
//   {
//     name: 'input',
//     deprecated: false,
//     type: {
//       parameters: [
//         {
//           name: 'prompt',
//           type: { type: 'literal', literal: 'string' },
//           deprecated: false,
//           documentation: 'The text to prompt the user to type',
//         },
//       ],
//       returnType: { type: 'literal', literal: 'string' },
//     },
//     documentation: 'Asks the user to enter information into the terminal',
//   },
//   {
//     name: 'str',
//     deprecated: false,
//     type: {
//       parameters: [
//         { name: '', type: { type: 'any' }, deprecated: false, documentation: 'The value to convert to a string' },
//       ],
//       returnType: { type: 'literal', literal: 'string' },
//     },
//     documentation: 'Convert to a string (text)',
//   },
//   {
//     name: 'int',
//     deprecated: false,
//     type: {
//       parameters: [
//         { name: '', type: { type: 'any' }, deprecated: false, documentation: 'The value to convert to an integer' },
//       ],
//       returnType: { type: 'literal', literal: 'number' },
//     },
//     documentation: 'Convert to an integer number (whole number)',
//   },
//   {
//     name: 'enumerate',
//     deprecated: false,
//     type: {
//       parameters: [
//         {
//           name: 'iterable',
//           type: { type: 'any' },
//           deprecated: false,
//           documentation: 'A list or other iterable object',
//         },
//       ],
//       returnType: { type: 'literal', literal: 'number' },
//     },
//     documentation: 'Loops over an iterable and returns pairs of the count and the items from the iterable.',
//   },
//   {
//     name: 'len',
//     deprecated: false,
//     type: {
//       parameters: [
//         {
//           name: 'iterable',
//           type: { type: 'any' },
//           deprecated: false,
//           documentation: 'A list or other iterable object',
//         },
//       ],
//       returnType: { type: 'literal', literal: 'number' },
//     },
//     documentation: 'Returns the length of something, how many items are in a list or characters in a string',
//   },
//   {
//     name: 'range',
//     deprecated: false,
//     type: {
//       parameters: [
//         {
//           name: 'start',
//           type: { type: 'any' },
//           deprecated: false,
//           documentation: 'The number to start counting from.',
//         },
//         {
//           name: 'end',
//           type: { type: 'any' },
//           deprecated: false,
//           documentation: 'Stop counting before this number, not including this number.',
//         },
//       ],
//       returnType: { type: 'any' },
//     },
//     documentation: 'Counts from a starting number up to, but not including, the end number.',
//   },
// ]

const functionArgTypeMapping = {
  POSITIONAL_ONLY: FunctionArgType.PositionalOnly,
  POSITIONAL_OR_KEYWORD: FunctionArgType.PositionalOrKeyword,
  KEYWORD_ONLY: FunctionArgType.KeywordOnly,
  VAR_POSITIONAL: FunctionArgType.Vargs,
  VAR_KEYWORD: FunctionArgType.Kwargs,
}

export function loadPythonBuiltinFunctions(scope: Scope) {
  const builtinsSpec: PythonModuleSpec = builtins

  for (const name in builtinsSpec.values) {
    const spec = builtinsSpec.values[name]
    if (spec.isCallable) {
      const typeInfo: VariableTypeInfo = {
        category: TypeCategory.Function,
        arguments: [],
      }
      if (spec.parameters) {
        const args = spec.parameters.map((argInfo) => {
          const arg: FunctionArgument = {
            name: argInfo.name,
            type: functionArgTypeMapping[argInfo.kind],
          }
          if (argInfo.default) {
            arg.defaultValue = argInfo.default
          }
          return arg
        })
        typeInfo.arguments = args
      }
      scope.addBuiltIn(name, { documentation: spec.shortDoc, typeInfo: typeInfo })
      scope.hasEntries()
    }
  }
}
