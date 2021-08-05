
importScripts('https://cdn.jsdelivr.net/pyodide/v0.17.0/full/pyodide.js')

let stdinbuffer = null;

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
    return text; //.replace('\r', '\n');
  }
}

let executorCode = null;
let nodetree = null;


const run = async () => {
  try {
    await pyodide.pyodide_py.eval_code_async(executorCode, undefined, undefined, 'none');
  } catch(err) {
    postMessage({
      type: 'stdout',
      stdout: err.toString(),
    })
  }
}

const getNodeTree = () => {
  return nodetree;
}

loadPyodide({ indexURL : 'https://cdn.jsdelivr.net/pyodide/v0.17.0/full/' }).then(async () => {
  pyodide.registerJsModule('fakeprint', {
    stdout: stdout,
    stderr: stdout,
    stdin: stdin,
  });
  pyodide.registerJsModule('nodetree', {
    getNodeTree: () => {
      return pyodide.toPy(getNodeTree());
    }
  });
  executorCode = await (await fetch('/static_frame/python/executor.py')).text()
  postMessage({
    type: 'ready',
  })
});

onmessage = function(e) {
  switch (e.data.type) {
    case 'run':
      nodetree = e.data.nodetree;
      stdinbuffer = new Int32Array(e.data.buffer);
      run(e.data.nodetree)
  }
}