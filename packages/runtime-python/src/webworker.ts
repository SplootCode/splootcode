import {
  ExpressionNode,
  SourceFile,
  StructuredEditorProgram,
  Type,
  TypeCategory,
  createStructuredProgramWorker,
} from 'structured-pyright'
import { ExpressionTypeInfo, ExpressionTypeRequest, ParseTreeInfo } from '@splootcode/language-python'
import { FetchSyncErrorType, FileSpec, ResponseData, WorkerManagerMessage, WorkerMessage } from './runtime/common'
import { HTTPRequestAWSEvent, RunType } from '@splootcode/core'
import { IDFinderWalker, PyodideFakeFileSystem } from './structured'

// If we're not in a module context (prod build is non-module)
// Then we need to imoprt Pyodide this way, but it fails in a module context (local dev).
if (importScripts) {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js')
  } catch (e) {
    console.warn(e)
  }
}

let pyodide = null
let stdinbuffer: Int32Array = null
let fetchBuffer: Uint8Array = null
let fetchBufferMeta: Int32Array = null
let rerun = false
let readlines: string[] = []
let requestPlayback: Map<string, ResponseData[]> = new Map()
let envVars: Map<string, string> = new Map()

let structuredProgram: StructuredEditorProgram = null

const sendMessage = (message: WorkerMessage) => {
  postMessage(message)
}

const stdout = {
  write: (s) => {
    sendMessage({
      type: 'stdout',
      stdout: s,
    })
  },
  flush: () => {},
}

const stderr = {
  write: (s: string) => {
    sendMessage({
      type: 'stderr',
      stderr: s,
    })
  },
  flush: () => {},
}

const stdin = {
  readline: () => {
    if (rerun) {
      if (readlines.length === 0) {
        return ''
      }
      const val = readlines.shift()
      sendMessage({
        type: 'stdout',
        stdout: val,
      })
      return val
    }

    let text = ''
    // Keep reading from the buffer until we have a newline
    while (text[text.length - 1] !== '\n') {
      // Send message to activate input mode
      sendMessage({
        type: 'stdin',
      })
      Atomics.wait(stdinbuffer, 0, -1)
      const numberOfElements = stdinbuffer[0]
      stdinbuffer[0] = -1
      const newStdinData = new Uint8Array(numberOfElements)
      for (let i = 0; i < numberOfElements; i++) {
        newStdinData[i] = stdinbuffer[1 + i]
      }
      const responseStdin = new TextDecoder('utf-8').decode(newStdinData)
      text += responseStdin
    }
    sendMessage({
      type: 'inputValue',
      value: text,
    })
    return text
  },
}

const replayFetch = (fetchData: {
  method: string
  url: string
  headers: { [key: string]: string }
  body: any
}): ResponseData => {
  const serializedRequest = JSON.stringify(fetchData)
  if (requestPlayback && requestPlayback.has(serializedRequest)) {
    const responses = requestPlayback.get(serializedRequest)
    if (responses.length !== 0) {
      return responses.shift()
    }
  }
  return {
    error: {
      type: FetchSyncErrorType.NO_RECORDED_REQUEST,
      message: 'Run program to make requests.',
    },
  }
}

const syncFetch = (method: string, url: string, headers: any, body: any): ResponseData => {
  let objHeaders = {}
  let bodyArray: Uint8Array | string = null
  if (pyodide.isPyProxy(headers) && headers.type === 'dict') {
    objHeaders = headers.toJs({ dict_converter: Object.fromEntries })
  }
  if (typeof body === 'string') {
    bodyArray = body
  } else if (pyodide.isPyProxy(body) && body.type === 'bytes') {
    bodyArray = body.toJs() as Uint8Array
  }

  if (rerun) {
    return replayFetch({ method, url, headers: objHeaders, body: bodyArray })
  }

  sendMessage({
    type: 'fetch',
    data: {
      method: method,
      url: url,
      headers: objHeaders,
      body: bodyArray,
    },
  })
  const res = Atomics.wait(fetchBufferMeta, 0, 0)
  if (res === 'timed-out') {
    // TODO: Support request timeout
  }
  const headerSize = Atomics.exchange(fetchBufferMeta, 1, 0)
  const bodySize = Atomics.exchange(fetchBufferMeta, 2, 0)
  const totalSize = headerSize + bodySize
  let buffer: Uint8Array
  if (totalSize <= fetchBuffer.length) {
    buffer = fetchBuffer
    Atomics.store(fetchBufferMeta, 0, 0)
  } else {
    let bytesRead = 0
    buffer = new Uint8Array(totalSize)
    while (bytesRead < totalSize) {
      const toRead = Math.min(totalSize - bytesRead, fetchBuffer.length)
      buffer.set(fetchBuffer.subarray(0, toRead), bytesRead)
      bytesRead += toRead
      Atomics.store(fetchBufferMeta, 0, 0)
      if (bytesRead < totalSize) {
        sendMessage({ type: 'continueFetch' })
        Atomics.wait(fetchBufferMeta, 0, 0)
      }
    }
  }
  const bytes = buffer.slice(0, headerSize)
  const contentBytes = buffer.slice(headerSize, headerSize + bodySize)

  const decoder = new TextDecoder()
  const textJSON = decoder.decode(bytes)
  const result = JSON.parse(textJSON) as ResponseData
  result.body = contentBytes
  return result
}

let executorCode = null
let moduleLoaderCode = null
let textGenerationCode = null
let workspace: Map<string, FileSpec> = new Map()
let runType: RunType | null = null
let eventData: HTTPRequestAWSEvent | null = null

const EnvVarCode = `
import os;
for varName in os.environ:
  if varName not in ['USER', 'LOGNAME', 'PATH', 'PWD', 'HOME', 'LANG', '_']:
    del os.environ[varName];
for varName, varValue in envVars.items():
  os.environ[varName] = varValue;
`

const run = async () => {
  try {
    // Set up environment variables.
    // This is a bit hacky but pyodide's API doesn't give us access to environment variables.
    const globals = pyodide.toPy({ envVars: pyodide.toPy(envVars) })
    await pyodide.runPython(EnvVarCode, {
      globals: globals,
    })

    await pyodide.runPython(executorCode)
  } catch (err) {
    sendMessage({
      type: 'stderr',
      stderr: err.toString(),
    })
  }
  sendMessage({
    type: 'finished',
  })
}

const generateTextContent = async (returnToEditor: boolean) => {
  try {
    const res = await pyodide.runPython(textGenerationCode)
    const results = new Map()
    results.set('main.py', res)
    if (res) {
      sendMessage({
        type: 'text_code_content',
        fileContents: results,
        return_to_editor: returnToEditor,
      })
    }
  } catch (err) {
    sendMessage({
      type: 'stderr',
      stderr: err.toString(),
    })
  }
}

const loadModule = async (moduleName) => {
  try {
    const res = pyodide.runPython(`generate_module_info("${moduleName}")`)
    if (!res) {
      // Returns None if module does not exist or cannot be imported.
      return
    }
    const jsResult = res.toJs({ dict_converter: Object.fromEntries })
    if (jsResult) {
      sendMessage({
        type: 'module_info',
        info: jsResult,
      })
    }
  } catch (err) {
    console.warn(err)
  }
}

const getWorkspace = () => {
  return workspace
}

interface StaticURLs {
  executorURL: string
  moduleLoaderURL: string
  requestsPackageURL: string
  flaskPackageURL: string
  serverlessWSGIPackageURL: string
  textGeneratorURL: string
}

export const initialize = async (urls: StaticURLs, typeshedPath: string) => {
  // @ts-ignore
  if (typeof loadPyodide == 'undefined') {
    // import is a syntax error in non-module context (which we need to be in for Firefox...)
    // But we use module context for local dev because... Vite does that.
    await eval("import('https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js')")
  }

  executorCode = await (await fetch(urls.executorURL)).text()
  moduleLoaderCode = await (await fetch(urls.moduleLoaderURL)).text()
  textGenerationCode = await (await fetch(urls.textGeneratorURL)).text()

  // @ts-ignore
  pyodide = await loadPyodide({ fullStdLib: false, indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.3/full/' })
  pyodide.registerJsModule('fakeprint', {
    stdout: stdout,
    stderr: stderr,
    stdin: stdin,
  })
  pyodide.registerJsModule('nodetree', {
    getNodeTree: () => {
      const nodeTree = getWorkspace().get('main.py').content
      return pyodide.toPy(nodeTree)
    },
    getIterationLimit: () => {
      if (rerun) {
        return pyodide.toPy(10000)
      }
      return pyodide.toPy(0)
    },
    getRunType: () => {
      return runType as string
    },
    getEventData: () => {
      return pyodide.toPy(eventData)
    },
  })
  pyodide.registerJsModule('runtime_capture', {
    report: (json_dump) => {
      const captureMap = new Map()
      captureMap.set('main.py', JSON.parse(json_dump))
      sendMessage({
        type: 'runtime_capture',
        captures: captureMap,
      })
    },
  })
  pyodide.registerJsModule('web_response', {
    report: (json_dump) => {
      sendMessage({
        type: 'web_response',
        response: JSON.parse(json_dump),
      })
    },
  })
  pyodide.registerJsModule('__splootcode_internal', {
    sync_fetch: syncFetch,
  })

  await pyodide.loadPackage('micropip')
  const micropip = pyodide.pyimport('micropip')
  await micropip.install(urls.requestsPackageURL)
  await micropip.install(urls.flaskPackageURL)
  await micropip.install(urls.serverlessWSGIPackageURL)
  await pyodide.loadPackage('numpy')
  await micropip.install('ast-comments')

  pyodide.globals.set('__name__', '__main__')
  pyodide.runPython(moduleLoaderCode)

  structuredProgram = createStructuredProgramWorker(new PyodideFakeFileSystem(typeshedPath, pyodide))

  sendMessage({
    type: 'ready',
  })
}

let currentParseID: number = null
let sourceFile: SourceFile = null

let expressionTypeRequestsToResolve: ExpressionTypeRequest[] = []

const updateParseTree = async (parseTreeInfo: ParseTreeInfo) => {
  if (!structuredProgram) {
    console.error('structuredProgram is not defined yet')
  }

  const { parseTree, path, modules } = parseTreeInfo

  structuredProgram.updateStructuredFile(path, parseTree, modules)
  await structuredProgram.parseRecursively(path)

  sourceFile = structuredProgram.getBoundSourceFile(path)
  currentParseID = parseTreeInfo.treeID

  if (expressionTypeRequestsToResolve.length > 0) {
    const toResolve = expressionTypeRequestsToResolve.filter((request) => request.treeID === currentParseID)

    toResolve.forEach((request) => getExpressionTypeInfo(request))

    expressionTypeRequestsToResolve = expressionTypeRequestsToResolve.filter(
      (request) => request.treeID !== currentParseID
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
  }

  throw new Error('unhandled type category')
}

const getExpressionTypeInfo = (request: ExpressionTypeRequest) => {
  const walker = new IDFinderWalker(request.expression.id)
  walker.walk(sourceFile.getParseResults().parseTree)

  if (walker.found) {
    const type = structuredProgram.evaluator.getTypeOfExpression(walker.found as ExpressionNode)

    sendMessage({
      type: 'expression_type_info',
      response: {
        treeID: currentParseID,
        type: toExpressionTypeInfo(type.type),
        requestID: request.requestID,
      },
    })
  } else {
    console.error('could not find node in tree')
  }
}

onmessage = function (e: MessageEvent<WorkerManagerMessage>) {
  switch (e.data.type) {
    case 'run':
      eventData = e.data.eventData
      runType = e.data.runType
      workspace = e.data.workspace
      stdinbuffer = e.data.stdinBuffer
      fetchBuffer = e.data.fetchBuffer
      fetchBufferMeta = e.data.fetchBufferMeta
      rerun = false
      requestPlayback = null
      envVars = e.data.envVars || new Map<string, string>()
      run()
      break
    case 'rerun':
      runType = e.data.runType

      eventData = e.data.eventData
      workspace = e.data.workspace
      stdinbuffer = null
      fetchBuffer = null
      fetchBufferMeta = null
      readlines = e.data.readlines
      requestPlayback = e.data.requestPlayback
      rerun = true
      envVars = e.data.envVars || new Map<string, string>()
      run()
      break
    case 'generate_text_code':
      workspace = e.data.workspace
      generateTextContent(e.data.return_to_editor)
      break
    case 'loadModule':
      loadModule(e.data.moduleName)
      break
    case 'parseTree':
      updateParseTree(e.data.parseTree)

      break
    case 'requestExpressionTypeInfo':
      if (e.data.request.treeID < currentParseID) {
        console.warn('issued request for expression type for old parse tree', e.data.request.treeID, currentParseID)
      } else if (e.data.request.treeID > currentParseID) {
        console.warn('issued request for expression type for future parse tree')

        expressionTypeRequestsToResolve.push(e.data.request)
      } else {
        // treeID and currentParseTree match

        getExpressionTypeInfo(e.data.request)
      }

      break
    default:
      // @ts-ignore
      console.warn(`Worker recieved unrecognised message type: ${e.data.type}`)
  }
}
