import { FetchSyncErrorType, ResponseData, WorkerManagerMessage, WorkerMessage } from './common'

importScripts('https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js')

let pyodide = null
let stdinbuffer: Int32Array = null
let fetchBuffer: Uint8Array = null
let fetchBufferMeta: Int32Array = null
let rerun = false
let readlines: string[] = []
let requestPlayback: Map<string, ResponseData[]> = new Map()

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
let nodetree = null

const run = async () => {
  try {
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

const getNodeTree = () => {
  return nodetree
}

const initialise = async () => {
  executorCode = await (await fetch(process.env.RUNTIME_PYTHON_STATIC_FOLDER + '/executor.py')).text()
  moduleLoaderCode = await (await fetch(process.env.RUNTIME_PYTHON_STATIC_FOLDER + '/module_loader.py')).text()
  // @ts-ignore
  pyodide = await loadPyodide({ fullStdLib: false, indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.3/full/' })
  pyodide.registerJsModule('fakeprint', {
    stdout: stdout,
    stderr: stderr,
    stdin: stdin,
  })
  pyodide.registerJsModule('nodetree', {
    getNodeTree: () => {
      return pyodide.toPy(getNodeTree())
    },
    getIterationLimit: () => {
      if (rerun) {
        return pyodide.toPy(10000)
      }
      return pyodide.toPy(0)
    },
  })
  pyodide.registerJsModule('runtime_capture', {
    report: (json_dump) => {
      sendMessage({
        type: 'runtime_capture',
        capture: json_dump,
      })
    },
  })
  pyodide.registerJsModule('__splootcode_internal', {
    sync_fetch: syncFetch,
  })
  await pyodide.loadPackage('micropip')
  const micropip = pyodide.pyimport('micropip')
  await micropip.install('http://localhost:3001/runtime-python/static/packages/requests-2.28.1-py3-none-any.whl')
  pyodide.globals.set('__name__', '__main__')
  pyodide.runPython(moduleLoaderCode)
  sendMessage({
    type: 'ready',
  })
}

initialise()

onmessage = function (e: MessageEvent<WorkerManagerMessage>) {
  switch (e.data.type) {
    case 'run':
      nodetree = e.data.nodetree
      stdinbuffer = e.data.stdinBuffer
      fetchBuffer = e.data.fetchBuffer
      fetchBufferMeta = e.data.fetchBufferMeta
      rerun = false
      requestPlayback = null
      run()
      break
    case 'rerun':
      nodetree = e.data.nodetree
      stdinbuffer = null
      fetchBuffer = null
      fetchBufferMeta = null
      readlines = e.data.readlines
      requestPlayback = e.data.requestPlayback
      rerun = true
      run()
      break
    case 'loadModule':
      loadModule(e.data.moduleName)
      break
    default:
      // @ts-ignore
      console.warn(`Worker recieved unrecognised message type: ${e.data.type}`)
  }
}
