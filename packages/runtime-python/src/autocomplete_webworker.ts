import { AutocompleteWorkerMessage, WorkerManagerAutocompleteMessage } from './runtime/common'
import { ExpressionNode, SourceFile, StructuredEditorProgram, createStructuredProgramWorker } from 'structured-pyright'
import { ExpressionTypeRequest, ParseTreeInfo, ParseTrees } from '@splootcode/language-python'
import { IDFinderWalker, PyodideFakeFileSystem } from './pyright'
import { StaticURLs } from './static_urls'
import { getAutocompleteInfo } from './autocomplete'
import { loadDependencies, setupPyodide, tryModuleLoadPyodide, tryNonModuleLoadPyodide } from './pyodide'

tryNonModuleLoadPyodide()

let pyodide: any = null
let structuredProgram: StructuredEditorProgram = null
let dependencies: Map<string, string> = null

const sendMessage = (message: AutocompleteWorkerMessage) => {
  postMessage(message)
}

export const initialize = async (staticURLs: StaticURLs, typeshedPath: string) => {
  await tryModuleLoadPyodide()

  // It's a significant startup-time performance hit to install streamlit, we need to
  // make it so that only some packages are installed depending on the project.
  // pyodide = await setupPyodide([staticURLs.requestsPackageURL, staticURLs.streamlitPackageURL])
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

let unfinishedParseTrees: ParseTrees = null

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

  unfinishedParseTrees = null
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
      if (!dependencies) {
        console.warn('received parse trees before dependencies were loaded')

        unfinishedParseTrees = e.data.parseTrees

        return
      }

      unfinishedParseTrees = null

      updateParseTrees(e.data.parseTrees)

      break
    case 'request_expression_type_info':
      if (!dependencies) {
        console.warn('received request for expression type before dependencies were loaded')
      }
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
    case 'load_dependencies':
      if (!dependencies) {
        dependencies = e.data.dependencies

        loadDependencies(pyodide, dependencies, 'autoocmplete').then(() => {
          if (unfinishedParseTrees) {
            updateParseTrees(unfinishedParseTrees)
          }
        })
      } else {
        console.warn('trying to load deps when already loaded them')
      }

      break
    default:
      console.warn('Autocomplete worker received unhandled message', e.data)

      break
  }
}
