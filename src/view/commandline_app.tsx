import React, { Component } from 'react'
import { registerCodeHandler } from './commandline';
import {UnControlled as CodeMirror} from 'react-codemirror2'

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';

enum RunState {
  NOT_STARTED = 0,
  RUNNING,
  AWAITING_PROMPT,
  EXIT_FAILURE,
  EXIT_SUCCESS,
}

interface CommandlineAppState {
  state: RunState,
}

function runCodeWithIO(code, mockConsole, mockPrompt) {
  console.log(code);
  let runCode = `
    "use strict";
    return(
      function(console, prompt) {
        ${code}
      }
    )  
  `;  
  // execute
  Function(runCode)()(mockConsole, mockPrompt);
}


export class CommandlineApp extends Component<{}, CommandlineAppState> {
  cmInstance: any;

  constructor(props: {}) {
    super(props);
    this.cmInstance = null;
    this.state ={
      state: RunState.NOT_STARTED,
    };
  }

  render() {
    return (
      <div>
        <CodeMirror
          value={''}
          options={{
            theme: 'material',
            lineNumbers: false,
            readOnly: true,
          }}
          editorDidMount={editor => { this.cmInstance = editor }}
        />
      </div>
    );
  }

  appendConsoleOutput(lines: string) {
    let doc = this.cmInstance.doc;
    let lastLine = doc.lastLine();
    doc.replaceRange(lines, {line: lastLine, ch: 0});
    let newLastLine = doc.lastLine();
    doc.markText({line: lastLine, ch:0}, {line: newLastLine, ch: 0}, {readOnly: true, inclusiveLeft: true});
  }

  async handlePrompt(promptText: string) {  
    this.cmInstance.setOption('readOnly', false);
    let doc = this.cmInstance.doc;
    let lastLine = doc.lastLine();
    doc.replaceRange(promptText, {line: lastLine, ch: 0});
    doc.markText({line: lastLine, ch:0}, {line: lastLine, ch: promptText.length}, {readOnly: true, inclusiveLeft: true});
    this.cmInstance.execCommand('goDocEnd');
    let promise = new Promise((resolve, reject) => {
      let listener = (editor, name, event) => {
        if (name === 'Enter') {
          let text = doc.lineInfo(lastLine).text as string;
          this.cmInstance.setOption('readOnly', true);
          this.cmInstance.off('keyHandled', listener);
          resolve(text.substring(promptText.length));
        }
      }
      this.cmInstance.on('keyHandled', listener);
    });
    return await promise;
  }

  componentDidMount() {
    registerCodeHandler(this.recieveNewCode);
  }

  recieveNewCode = (code: string) => {
    let mockConsole = {
      log: (...args : any[]) => {
        const res = [...args].slice(0, 15).map((arg, i) => {
          switch (typeof arg) {
            case 'object':
              // return '[object Object]'; // <ObjectInspector data={arg} key={`object-${i}`} />;
            case 'function':
              return `${arg}`;
            default:
              return arg;
          }
        });
        this.appendConsoleOutput(res.join(' ') + '\n'); }
    }
    let mockPrompt = (promptMessage: string) => { return this.handlePrompt(promptMessage) };
    runCodeWithIO(code, mockConsole, mockPrompt);
  }
}
