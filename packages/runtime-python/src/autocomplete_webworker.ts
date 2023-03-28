import {
  AutocompleteEntryFunctionArgument,
  AutocompleteInfo,
  ExpressionTypeInfo,
  ExpressionTypeRequest,
  ParseTreeInfo,
  ParseTrees,
} from '@splootcode/language-python'
import { AutocompleteWorkerMessage, WorkerManagerAutocompleteMessage } from './runtime/common'
import {
  ExpressionNode,
  ParameterCategory,
  Symbol as PyrightSymbol,
  SourceFile,
  StructuredEditorProgram,
  Type,
  TypeCategory,
  createStructuredProgramWorker,
} from 'structured-pyright'
import { IDFinderWalker, PyodideFakeFileSystem } from './pyright'
import { setupPyodide, tryModuleLoadPyodide, tryNonModuleLoadPyodide } from './pyodide'

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
  if (type.category === TypeCategory.Class) {
    return {
      category: type.category,
      name: type.details.fullName,
    }
  } else if (type.category === TypeCategory.Module) {
    return {
      category: type.category,
      name: type.moduleName,
    }
  } else if (type.category === TypeCategory.Union) {
    return {
      category: type.category,
      subtypes: type.subtypes.map((subtype) => toExpressionTypeInfo(subtype)),
    }
  } else if (
    type.category === TypeCategory.Unknown ||
    type.category === TypeCategory.Any ||
    type.category === TypeCategory.None
  ) {
    return null
  }

  throw new Error('unhandled type category ' + type.category)
}

const getAutocompleteInfo = (type: Type): AutocompleteInfo[] => {
  const suggestionsForEntries = (fields: Map<string, PyrightSymbol>): AutocompleteInfo[] => {
    return Array.from(fields.entries())
      .map(([key, value]): AutocompleteInfo[] => {
        const decs = value.getDeclarations()
        if (decs.length == 0) {
          return null
        }

        if (decs.length > 1) {
          console.warn('unhandled multiple declarations', key, decs)
        }

        const dec = decs[0]
        const inferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(value, dec)
        if (!inferredType) {
          return null
        }

        if (inferredType.category == TypeCategory.Class) {
          const suggestions: AutocompleteInfo[] = []
          const init = inferredType.details.fields.get('__init__')
          if (init && init.getDeclarations().length > 0) {
            const initInferredType = structuredProgram.evaluator.getInferredTypeOfDeclaration(
              init,
              init.getDeclarations()[0]
            )

            console.log(key, inferredType, value, inferredType.details.fields.get('__init__'), initInferredType)
          }

          suggestions.push({
            type: TypeCategory.Class,
            name: key,
            docString: inferredType.details.docString,
          })

          return suggestions
        } else if (inferredType.category == TypeCategory.Function) {
          const args: AutocompleteEntryFunctionArgument[] = []
          let keywordOnlyOverride = false

          for (let i = 0; i < inferredType.details.parameters.length; i++) {
            const param = inferredType.details.parameters[i]

            // detects keyword only arguments (https://peps.python.org/pep-3102/)
            if (param.category === ParameterCategory.VarArgList && i <= inferredType.details.parameters.length - 1) {
              keywordOnlyOverride = true

              continue
            }

            // TODO(harrison): handle kwargs and vargs

            if (!param.name) {
              continue
            }

            if (keywordOnlyOverride) {
              args.push({
                name: param.name,
                type: 3,
                hasDefault: !!param.defaultValueExpression,
              })

              continue
            }

            args.push({
              name: param.name,
              type: 1,
              hasDefault: !!param.defaultValueExpression,
            })
          }

          return [
            {
              type: TypeCategory.Function,
              name: key,
              arguments: args,
            },
          ]
        }

        return null
      })
      .flat()
      .filter((suggestion) => suggestion !== null)
  }

  if (type.category === TypeCategory.Module) {
    return suggestionsForEntries(type.fields)
  } else if (type.category === TypeCategory.Class) {
    return suggestionsForEntries(type.details.fields)
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
