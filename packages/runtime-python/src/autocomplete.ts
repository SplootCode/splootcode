import {
  AutocompleteEntryCategory,
  AutocompleteEntryFunctionArgument,
  AutocompleteInfo,
  FunctionArgType,
} from '@splootcode/language-python'
import {
  FunctionParameter,
  ParameterCategory,
  Symbol as PyrightSymbol,
  StructuredEditorProgram,
  TypeCategory as TC,
  Type,
} from 'structured-pyright'

function getShortDoc(docString?: string) {
  if (!docString) {
    return ''
  }

  const lines = docString.split('\n')

  let short = lines[0]

  if (short.length > 100) {
    short = short.slice(0, 97) + '...'
  }

  return short
}

const pyrightParamsToSplootParams = (params: FunctionParameter[]): AutocompleteEntryFunctionArgument[] => {
  let seenVargs = false
  const args: AutocompleteEntryFunctionArgument[] = []
  for (let i = 0; i < params.length; i++) {
    const param = params[i]

    if (param.category === ParameterCategory.VarArgList) {
      seenVargs = true

      if (param.name) {
        args.push({
          name: param.name,
          type: FunctionArgType.Vargs,
          hasDefault: false,
        })

        continue
      }
    }

    if (param.category === ParameterCategory.VarArgDictionary) {
      seenVargs = true

      if (param.name) {
        args.push({
          name: param.name,
          type: FunctionArgType.Kwargs,
          hasDefault: false,
        })
      }

      break
    }

    if (!param.name) {
      continue
    }

    // detects keyword only arguments (https://peps.python.org/pep-3102/)
    if (seenVargs) {
      args.push({
        name: param.name,
        type: FunctionArgType.KeywordOnly,
        hasDefault: !!param.defaultValueExpression,
      })

      continue
    }

    args.push({
      name: param.name,
      type: FunctionArgType.PositionalOrKeyword,
      hasDefault: !!param.defaultValueExpression,
    })
  }

  return args
}

const suggestionsForEntries = (
  program: StructuredEditorProgram,
  fields: Map<string, PyrightSymbol>,
  seen: Set<string>,
  parentName?: string
): AutocompleteInfo[] => {
  const evaluator = program.evaluator
  if (!evaluator) {
    return []
  }

  return Array.from(fields.entries())
    .map(([key, value]): AutocompleteInfo[] => {
      if (seen.has(key)) {
        return []
      }
      seen.add(key)

      const decs = value.getDeclarations()

      return decs
        .map((dec, i): AutocompleteInfo[] => {
          const inferredType = evaluator.getInferredTypeOfDeclaration(value, dec)
          if (!inferredType) {
            return []
          }

          if (inferredType.category == TC.Class) {
            if ((inferredType.flags & 1) == 1) {
              const init = inferredType.details.fields.get('__init__')
              let args: AutocompleteEntryFunctionArgument[] = []

              if (init && init.getDeclarations().length > 0) {
                const initInferredType = evaluator.getInferredTypeOfDeclaration(init, init.getDeclarations()[0])

                if (initInferredType && initInferredType.category === TC.Function) {
                  args = pyrightParamsToSplootParams(initInferredType.details.parameters.slice(1))
                }
              }

              return [
                {
                  category: AutocompleteEntryCategory.Function,
                  name: key,
                  arguments: args,
                  typeIfMethod: parentName,
                  declarationNum: i,
                  shortDoc: getShortDoc(inferredType.details.docString),
                },
              ]
            }

            return [
              {
                name: key,
                typeIfAttr: parentName,
                declarationNum: i,
                shortDoc: getShortDoc(inferredType.details.docString),
                category: AutocompleteEntryCategory.Value,
              },
            ]
          } else if (inferredType.category == TC.Function) {
            const args: AutocompleteEntryFunctionArgument[] = pyrightParamsToSplootParams(
              parentName ? inferredType.details.parameters.slice(1) : inferredType.details.parameters
            )

            return [
              {
                name: key,
                arguments: args,
                typeIfMethod: parentName,
                declarationNum: i,
                category: AutocompleteEntryCategory.Function,
                shortDoc: getShortDoc(inferredType.details.docString),
              },
            ]
          }

          return []
        })
        .flat()
    })
    .flat()
    .filter((suggestion) => suggestion !== null)
}

export function getAutocompleteInfo(
  program: StructuredEditorProgram,
  type: Type,
  seen?: Set<string>
): AutocompleteInfo[] {
  if (!seen) {
    seen = new Set()
  }

  if (type.category === TC.Module) {
    return suggestionsForEntries(program, type.fields, seen)
  } else if (type.category === TC.Class) {
    const suggestions: AutocompleteInfo[] = suggestionsForEntries(program, type.details.fields, seen, type.details.name)

    // TODO(harrison): should this loop through in reverse? or use type.details.mro?
    for (const base of type.details.baseClasses) {
      if (base.category !== TC.Class) {
        console.error('something very weird going on', base)
      }

      suggestions.push(...suggestionsForEntries(program, (base as any).details.fields, seen, type.details.name))
    }

    return suggestions
  } else if (type.category === TC.Union) {
    const suggestions: AutocompleteInfo[] = []

    for (const subtype of type.subtypes) {
      suggestions.push(...getAutocompleteInfo(program, subtype, seen))
    }

    return suggestions
  } else if (type.category === TC.Any || type.category === TC.Unknown) {
    // pass
  } else {
    console.error('unhandled type category', type)
  }

  return []
}
