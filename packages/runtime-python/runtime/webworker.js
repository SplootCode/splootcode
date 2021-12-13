importScripts('https://cdn.jsdelivr.net/pyodide/v0.18.1/full/pyodide.js')

let pyodide = null;
let stdinbuffer = null;
let rerun = false;
let readlines = [];

const stdout = {
  write: (s) => {
    postMessage({
      type: 'stdout',
      stdout: s
    })
  },
  flush: () => {},
}

const stdin = {
  readline: () => {
    if (rerun) {
      if (readlines.length === 0) {
        return '';
      }
      const val = readlines.shift();
      postMessage({
        type: 'stdout',
        stdout: val,
      })
      return val;
    }
    // Send message to activate input mode
    postMessage({
      type: 'inputMode',
    })
    let text = '';
    Atomics.wait(stdinbuffer, 0, -1);
    const numberOfElements = stdinbuffer[0];
    stdinbuffer[0] = -1;
    const newStdinData = new Uint8Array(numberOfElements);
    for (let i = 0; i < numberOfElements; i++) {
      newStdinData[i] = stdinbuffer[1 + i];
    }
    responseStdin = new TextDecoder("utf-8").decode(newStdinData);
    text += responseStdin;
    postMessage({
      type: 'inputValue',
      value: text,
    })
    return text; //.replace('\r', '\n');
  }
}

let executorCode = null;
let nodetree = null;

const run = async () => {
  try {
    await pyodide.runPythonAsync(executorCode);
  } catch(err) {
    postMessage({
      type: 'stdout',
      stdout: err.toString(),
    })
  }
  postMessage({
    'type': 'finished',
  })
}

const getNodeTree = () => {
  return nodetree;
}

const initialise = async () => {
  executorCode = await (await fetch(process.env.RUNTIME_PYTHON_STATIC_FOLDER + '/executor.py')).text()
  pyodide = await loadPyodide({ fullStdLib: false, indexURL : 'https://cdn.jsdelivr.net/pyodide/v0.18.1/full/' })
  pyodide.registerJsModule('fakeprint', {
    stdout: stdout,
    stderr: stdout,
    stdin: stdin,
  });
  pyodide.registerJsModule('nodetree', {
    getNodeTree: () => {
      return pyodide.toPy(getNodeTree());
    },
    getIterationLimit: () => {
      if (rerun) {
        return pyodide.toPy(10000);
      }
      return pyodide.toPy(0);
    }
  });
  pyodide.registerJsModule('runtime_capture', {
    report: (json_dump) => {
      postMessage({
        type: 'runtime_capture',
        capture: json_dump,
      })
    }
  });
  postMessage({
    type: 'ready',
  });
};

initialise();

onmessage = function(e) {
  switch (e.data.type) {
    case 'run':
      nodetree = e.data.nodetree;
      stdinbuffer = new Int32Array(e.data.buffer);
      rerun = false;
      run();
      break
    case 'rerun':
      nodetree = e.data.nodetree;
      stdinbuffer = new Int32Array(e.data.buffer);
      readlines = e.data.readlines;
      rerun = true;
      run();
      break;
  }
}