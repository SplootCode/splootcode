import { AutocompleteWorkerMessage, WorkerManagerAutocompleteMessage } from './runtime/common'
import {
  ExpressionNode,
  SourceFile,
  StructuredEditorProgram,
  Type,
  TypeCategory,
  createStructuredProgramWorker,
} from 'structured-pyright'
import { ExpressionTypeInfo, ExpressionTypeRequest, ParseTreeInfo, ParseTrees } from '@splootcode/language-python'
import { IDFinderWalker, PyodideFakeFileSystem } from './pyright'
import { setupPyodide, tryModuleLoad, tryNonModuleLoad } from './pyodide'

tryNonModuleLoad()
let pyodide: any = null
let structuredProgram: StructuredEditorProgram = null

const sendMessage = (message: AutocompleteWorkerMessage) => {
  postMessage(message)
}

export const initialize = async (typeshedPath: string) => {
  console.log('hello from autocomplete worker', typeshedPath)

  pyodide = await tryModuleLoad()

  await setupPyodide(pyodide, [])

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
      },
    })
  } else {
    console.error('could not find node in tree')
  }
}

onmessage = function (e: MessageEvent<WorkerManagerAutocompleteMessage>) {
  console.log('autocomplete got message', e)

  switch (e.data.type) {
    case 'parse_trees':
      console.log('received parse trees')
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
