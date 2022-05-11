importScripts('https://cdn.jsdelivr.net/pyodide/v0.18.1/full/pyodide.js')

let pyodide = null
let stdinbuffer = null
let rerun = false
let readlines = []

const stdout = {
  write: (s) => {
    postMessage({
      type: 'stdout',
      stdout: s,
    })
  },
  flush: () => {},
}

const stderr = {
  write: (s) => {
    postMessage({
      type: 'stderr',
      stdout: s,
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
      postMessage({
        type: 'stdout',
        stdout: val,
      })
      return val
    }

    let text = ''
    // Keep reading from the buffer until we have a newline
    while (text[text.length - 1] !== '\n') {
      // Send message to activate input mode
      postMessage({
        type: 'stdin',
      })
      Atomics.wait(stdinbuffer, 0, -1)
      const numberOfElements = stdinbuffer[0]
      stdinbuffer[0] = -1
      const newStdinData = new Uint8Array(numberOfElements)
      for (let i = 0; i < numberOfElements; i++) {
        newStdinData[i] = stdinbuffer[1 + i]
      }
      responseStdin = new TextDecoder('utf-8').decode(newStdinData)
      text += responseStdin
    }
    postMessage({
      type: 'inputValue',
      value: text,
    })
    return text
  },
}

let executorCode = null
let moduleLoaderCode = null
let nodetree = null

const run = async () => {
  try {
    await pyodide.runPython(executorCode)
  } catch (err) {
    postMessage({
      type: 'stderr',
      stdout: err.toString(),
    })
  }
  postMessage({
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
      postMessage({
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
  pyodide = await loadPyodide({ fullStdLib: false, indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.18.1/full/' })
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
      postMessage({
        type: 'runtime_capture',
        capture: json_dump,
      })
    },
  })
  pyodide.globals.set('__name__', '__main__')
  pyodide.runPython(moduleLoaderCode)
  postMessage({
    type: 'ready',
  })
}

initialise()

onmessage = function (e) {
  switch (e.data.type) {
    case 'run':
      nodetree = e.data.nodetree
      stdinbuffer = new Int32Array(e.data.buffer)
      rerun = false
      run()
      break
    case 'rerun':
      nodetree = e.data.nodetree
      stdinbuffer = null
      readlines = e.data.readlines
      rerun = true
      run()
      break
    case 'loadModule':
      loadModule(e.data.moduleName)
      break
    default:
      console.warn(`Worker recieved unrecognised message type: ${e.data.type}`)
  }
}
