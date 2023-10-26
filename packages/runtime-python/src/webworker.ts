import { Dependency, HTTPRequestAWSEvent, RunType } from '@splootcode/core'
import {
  FetchSyncErrorType,
  FileSpec,
  ResponseData,
  WorkerManagerMessage,
  WorkerMessage,
  sameDepencencies,
} from './runtime/common'
import { StaticURLs } from './static_urls'
import { loadDependencies, setupPyodide, tryModuleLoadPyodide, tryNonModuleLoadPyodide } from './pyodide'

tryNonModuleLoadPyodide()

let pyodide: any = null
let stdinbuffer: Int32Array = null
let fetchBuffer: Uint8Array = null
let fetchBufferMeta: Int32Array = null
let rerun = false
let readlines: string[] = []
let requestPlayback: Map<string, ResponseData[]> = new Map()
let envVars: Map<string, string> = new Map()
let dependencies: Dependency[] = null
let staticURLs: StaticURLs = null

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
  flush: () => { },
}

const stderr = {
  write: (s: string) => {
    sendMessage({
      type: 'stderr',
      stderr: s,
    })
  },
  flush: () => { },
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

// TODO: we should probably pass tonge in here
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

export const initialize = async (urls: StaticURLs, typeshedPath: string) => {
  staticURLs = urls

  await tryModuleLoadPyodide()

  executorCode = await (await fetch(urls.executorURL)).text()
  moduleLoaderCode = await (await fetch(urls.moduleLoaderURL)).text()
  textGenerationCode = await (await fetch(urls.textGeneratorURL)).text()

  pyodide = await setupPyodide([])

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

  pyodide.globals.set('__name__', '__main__')
  pyodide.runPython(moduleLoaderCode)

  sendMessage({
    type: 'ready',
  })
}

onmessage = function(e: MessageEvent<WorkerManagerMessage>) {
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

      if (!dependencies) {
        // this is first load
        loadDependencies(pyodide, e.data.dependencies, staticURLs).then(() => run())
        dependencies = e.data.dependencies
      } else if (!sameDepencencies(dependencies, e.data.dependencies)) {
        console.warn('dependencies not the same! danger! worker should have been restarted')
      } else {
        run()
      }

      break
    case 'generate_text_code':
      workspace = e.data.workspace
      generateTextContent(e.data.return_to_editor)
      break
    case 'loadModule':
      loadModule(e.data.moduleName)
      break
    default:
      // @ts-ignore
      console.warn(`Worker recieved unrecognised message type: ${e.data.type}`)
  }
}
