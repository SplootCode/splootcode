import {
  AutocompleteEntryFunctionArgument,
  AutocompleteInfo,
  ExpressionTypeInfo,
  ExpressionTypeRequest,
  FunctionArgType,
  ParseTreeInfo,
  ParseTrees,
} from '@splootcode/language-python'
import { AutocompleteWorkerMessage, WorkerManagerAutocompleteMessage } from './runtime/common'
import {
  ExpressionNode,
  FunctionParameter,
  ParameterCategory,
  Symbol as PyrightSymbol,
  SourceFile,
  StructuredEditorProgram,
  TypeCategory as TC,
  Type,
  createStructuredProgramWorker,
} from 'structured-pyright'
import { IDFinderWalker, PyodideFakeFileSystem } from './pyright'
import { setupPyodide, tryModuleLoadPyodide, tryNonModuleLoadPyodide } from './pyodide'

// console.log('HELLO ?????', AutocompleteEntryCategory)

try {
  // console.log('HELLO ?????', AutocompleteEntryCategory)
} catch (e) {
  console.log(e)
}

tryNonModuleLoadPyodide()

let pyodide: any = null
let structuredProgram: StructuredEditorProgram = null

const sendMessage = (message: AutocompleteWorkerMessage) => {
  postMessage(message)
}

interface StaticURLs {
  requestsPackageURL: string
}

export const initialize = async (staticURLs: StaticURLs, typeshedPath: string) => {
  await tryModuleLoadPyodide()

  pyodide = await setupPyodide([staticURLs.requestsPackageURL])

  structuredProgram = createStructuredProgramWorker(new PyodideFakeFileSystem(typeshedPath, pyodide))

  console.log('HELLO ?????')
  sendMessage({ type: 'ready' })
}

const updateParseTree = async (parseTreeInfo: ParseTreeInfo): Promise<SourceFile> => {
  const { parseTree, path, modules } = parseTreeInfo

  structuredProgram.updateStructuredFile(path, parseTree, modules)
  await structuredProgram.parseRecursively(path)

  return structuredProgram.getBoundSourceFile(path)
}

let currentParseID: number = null
let sourceMap: Map<string, SourceFile> = new Map()
let expressionTypeRequestsToResolve: ExpressionTypeRequest[] = []

const updateParseTrees = async (trees: ParseTrees) => {
  if (!structuredProgram) {
    console.error('structuredProgram is not defined yet')
    return
  }

  const newSourceMap: Map<string, SourceFile> = new Map()
  for (const tree of trees.parseTrees) {
    newSourceMap.set(tree.path, await updateParseTree(tree))
  }

  sourceMap = newSourceMap
  currentParseID = trees.parseID

  if (expressionTypeRequestsToResolve.length > 0) {
    const toResolve = expressionTypeRequestsToResolve.filter((request) => request.parseID === currentParseID)

    toResolve.forEach((request) => getExpressionTypeInfo(request))

    expressionTypeRequestsToResolve = expressionTypeRequestsToResolve.filter(
      (request) => request.parseID !== currentParseID
    )

    if (expressionTypeRequestsToResolve.length > 0) {
      console.warn('could not resolve all expression type requests', expressionTypeRequestsToResolve)
    }
  }
}

const toExpressionTypeInfo = (type: Type): ExpressionTypeInfo => {
  if (type.category === TC.Class) {
    return {
      category: type.category,
      name: type.details.fullName,
    }
  } else if (type.category === TC.Module) {
    return {
      category: type.category,
      name: type.moduleName,
    }
  } else if (type.category === TC.Union) {
    return {
      category: type.category,
      subtypes: type.subtypes.map((subtype) => toExpressionTypeInfo(subtype)),
    }
  } else if (type.category === TC.Unknown || type.category === TC.Any || type.category === TC.None) {
    return null
  }

  throw new Error('unhandled type category ' + type.category)
}

const getAutocompleteInfo = (type: Type, seen?: Set<string>): AutocompleteInfo[] => {
  if (!seen) {
    seen = new Set()
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
    fields: Map<string, PyrightSymbol>,
    seen: Set<string>,
    parentName?: string
  ): AutocompleteInfo[] => {
    return Array.from(fields.entries())
      .map(([key, value]): AutocompleteInfo[] => {
        if (seen.has(key)) {
          return []
        }

        const decs = value.getDeclarations()

        return decs
          .map((dec, i): AutocompleteInfo[] => {
            const inferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(value, dec)
            if (!inferredType) {
              return null
            }

            if (inferredType.category == TC.Class) {
              if ((inferredType.flags & 1) == 1) {
                const init = inferredType.details.fields.get('__init__')
                let args: AutocompleteEntryFunctionArgument[] = []

                if (init && init.getDeclarations().length > 0) {
                  const initInferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(
                    init,
                    init.getDeclarations()[0]
                  )

                  if (initInferredType.category === TC.Function) {
                    args = pyrightParamsToSplootParams(initInferredType.details.parameters.slice(1))
                  }
                }

                // TODO(harrison): hoist to top of function?
                seen.add(key)

                // TODO(harrison): copy doc from class to __init__ method
                return [
                  {
                    type: TC.Function,
                    name: key,
                    arguments: args,
                    typeIfAttr: parentName,
                    declarationNum: i,
                    category: 1,
                  },
                ]
              }

              seen.add(key)

              return [
                {
                  type: TC.Class,
                  name: key,
                  docString: inferredType.details.docString,
                  typeIfAttr: parentName,
                  declarationNum: i,
                  category: 0,
                },
              ]
            } else if (inferredType.category == TC.Function) {
              const args: AutocompleteEntryFunctionArgument[] = pyrightParamsToSplootParams(
                parentName ? inferredType.details.parameters.slice(1) : inferredType.details.parameters
              )

              seen.add(key)

              return [
                {
                  type: TC.Function,
                  name: key,
                  arguments: args,
                  typeIfAttr: parentName,
                  declarationNum: i,
                  category: 1,
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

  if (type.category === TC.Module) {
    return suggestionsForEntries(type.fields, seen)
  } else if (type.category === TC.Class) {
    const suggestions: AutocompleteInfo[] = suggestionsForEntries(type.details.fields, seen, type.details.name)

    // TODO(harrison): should this loop through in reverse? or use type.details.mro?
    for (const base of type.details.baseClasses) {
      if (base.category !== TC.Class) {
        console.error('something very weird going on', base)
      }

      const suggs = suggestionsForEntries((base as any).details.fields, seen, type.details.name)

      suggestions.push(...suggs)
    }

    return suggestions
  } else if (type.category === TC.Union) {
    const suggestions: AutocompleteInfo[] = []

    for (const subtype of type.subtypes) {
      suggestions.push(...getAutocompleteInfo(subtype, seen))
    }

    console.log(type.subtypes)

    return suggestions
  } else if (type.category === TC.Any || type.category === TC.Unknown) {
    // pass
  } else {
    console.error('unhandled type category', type)
  }

  return []
}

const getExpressionTypeInfo = (request: ExpressionTypeRequest) => {
  const sourceFile = sourceMap.get(request.path)
  if (!sourceFile) {
    console.error('source file not found!')
    return
  }

  const walker = new IDFinderWalker(request.expression.id)
  walker.walk(sourceFile.getParseResults().parseTree)

  if (walker.found) {
    const type = structuredProgram.evaluator.getTypeOfExpression(walker.found as ExpressionNode)

    sendMessage({
      type: 'expression_type_info',
      response: {
        parseID: currentParseID,
        type: toExpressionTypeInfo(type.type),
        requestID: request.requestID,
        autocompleteSuggestions: getAutocompleteInfo(type.type),
      },
    })
  } else {
    console.error('could not find node in tree')
  }
}

onmessage = function (e: MessageEvent<WorkerManagerAutocompleteMessage>) {
  switch (e.data.type) {
    case 'parse_trees':
      updateParseTrees(e.data.parseTrees)

      break
    case 'request_expression_type_info':
      if (e.data.request.parseID < currentParseID) {
        console.warn('issued request for expression type for old parse tree', e.data.request.parseID, currentParseID)
      } else if (e.data.request.parseID > currentParseID) {
        console.warn('issued request for expression type for future parse tree')

        expressionTypeRequestsToResolve.push(e.data.request)
      } else {
        // treeID and currentParseTree match

        getExpressionTypeInfo(e.data.request)
      }

      break
    default:
      console.warn('Autocomplete worker received unhandled message', e.data)

      break
  }
}
