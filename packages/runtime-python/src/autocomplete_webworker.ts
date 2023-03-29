import { AutocompleteWorkerMessage, WorkerManagerAutocompleteMessage } from './runtime/common'
import { ExpressionNode, SourceFile, StructuredEditorProgram, createStructuredProgramWorker } from 'structured-pyright'
import { ExpressionTypeRequest, ParseTreeInfo, ParseTrees } from '@splootcode/language-python'
import { IDFinderWalker, PyodideFakeFileSystem } from './pyright'
import { getAutocompleteInfo } from './autocomplete'
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
    console.warn('structuredProgram is not defined yet')

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
        requestID: request.requestID,
        autocompleteSuggestions: getAutocompleteInfo(structuredProgram, type.type),
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
