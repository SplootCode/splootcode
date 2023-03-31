import {
  AutocompleteEntryCategory,
  AutocompleteEntryFunctionArgument,
  AutocompleteInfo,
  FunctionArgType,
} from '@splootcode/language-python'
import {
  Declaration,
  FunctionParameter,
  ParameterCategory,
  Symbol as PyrightSymbol,
  StructuredEditorProgram,
  TypeCategory as TC,
  Type,
  TypeBase,
} from 'structured-pyright'

export function getShortDoc(docString?: string) {
  if (!docString) {
    return ''
  }

  const lines = docString.split('\n')

  let short = lines.find((line) => line.trim().length > 0)
  if (!short) {
    return ''
  }

  if (short.length > 100) {
    short = short.slice(0, 97) + '...'
  }

  return short
}

function pyrightParamsToAutocompleteFunctionArguments(
  params: FunctionParameter[]
): AutocompleteEntryFunctionArgument[] {
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
        hasDefault: param.hasDefault,
      })

      continue
    }

    args.push({
      name: param.name,
      type: FunctionArgType.PositionalOrKeyword,
      hasDefault: param.hasDefault,
    })
  }

  return args
}

function suggestionsForDeclaration(
  fieldName: string,
  symbol: PyrightSymbol,
  structuredProgram: StructuredEditorProgram,
  parentName: string | undefined,
  declaration: Declaration,
  declarationIndex: number
): AutocompleteInfo[] {
  const inferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(symbol, declaration)
  if (!inferredType) {
    return []
  }

  // Attributes on methods and classes are considered to be in the Class category.
  if (inferredType.category == TC.Class) {
    if (TypeBase.isInstantiable(inferredType)) {
      let args: AutocompleteEntryFunctionArgument[] = []

      // Since this value is instantiable, we want the autocomplete suggestion to reflect that
      const newMethod = inferredType.details.fields.get('__new__')
      if (newMethod && newMethod.getDeclarations().length !== 0) {
        const decl = newMethod.getDeclarations()[0]
        // In cases where there is a __new__ method, we take the arguments from that
        const initInferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(newMethod, decl)

        if (initInferredType && initInferredType.category === TC.Function) {
          args = pyrightParamsToAutocompleteFunctionArguments(initInferredType.details.parameters.slice(1))
        }
      } else {
        const init = inferredType.details.fields.get('__init__')

        if (init && init.getDeclarations().length > 0) {
          const decl = init.getDeclarations()[0]
          // In cases where there is an __init__ method, we take the arguments from that
          const initInferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(init, decl)

          if (initInferredType && initInferredType.category === TC.Function) {
            args = pyrightParamsToAutocompleteFunctionArguments(initInferredType.details.parameters.slice(1))
          }
        }
      }

      let shortDoc = getShortDoc(inferredType.details.docString)
      const doc = structuredProgram.getDocumentationPartsforTypeAndDecl(inferredType, declaration)
      if (doc && doc.length !== 0) {
        shortDoc = getShortDoc(doc[0])
      }

      return [
        {
          category: AutocompleteEntryCategory.Function,
          name: fieldName,
          arguments: args,
          typeIfMethod: parentName,
          declarationNum: declarationIndex,
          shortDoc: shortDoc,
        },
      ]
    }

    return [
      {
        name: fieldName,
        typeIfAttr: parentName,
        declarationNum: declarationIndex,
        shortDoc: getShortDoc(inferredType.details.docString),
        category: AutocompleteEntryCategory.Value,
      },
    ]
  } else if (inferredType.category == TC.Function) {
    const args: AutocompleteEntryFunctionArgument[] = pyrightParamsToAutocompleteFunctionArguments(
      parentName ? inferredType.details.parameters.slice(1) : inferredType.details.parameters
    )

    let shortDoc = getShortDoc(inferredType.details.docString)
    const doc = structuredProgram.getDocumentationPartsforTypeAndDecl(inferredType, declaration)
    if (doc && doc.length !== 0) {
      shortDoc = getShortDoc(doc[0])
    }

    return [
      {
        name: fieldName,
        arguments: args,
        typeIfMethod: parentName,
        declarationNum: declarationIndex,
        category: AutocompleteEntryCategory.Function,
        shortDoc: shortDoc,
      },
    ]
  }

  return []
}

const suggestionsForEntries = (
  program: StructuredEditorProgram,
  fieldMap: Map<string, PyrightSymbol>,
  seen: Set<string>,
  parentName?: string
): AutocompleteInfo[] => {
  const evaluator = program.evaluator
  if (!evaluator) {
    return []
  }

  const fields = Array.from(fieldMap.entries())

  return fields
    .map(([fieldName, symbol]): AutocompleteInfo[] => {
      if (seen.has(fieldName) || symbol.isExternallyHidden()) {
        return []
      }

      seen.add(fieldName)

      const declarations = symbol.getDeclarations()
      return declarations
        .map((dec, i) => suggestionsForDeclaration(fieldName, symbol, program, parentName, dec, i))
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

    for (const base of type.details.baseClasses) {
      if (base.category !== TC.Class) {
        continue
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
