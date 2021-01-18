import 'tslib';

import React from 'react';
import ReactDOM from 'react-dom';

import { CommandlineApp } from './commandline_app';


let codeHandler: (code: string) => void = null;

export function registerCodeHandler(handler: (code: string) => void) {
  codeHandler = handler; 
}

export function recieveCode(code: string) {
  if (codeHandler !== null) {
    codeHandler(code);
  } else {
    console.warn('Recieved code, but the code handler was null.');
  }
}

export function loadCommandlineApp() {
  const root = document.getElementById('app-root')
  ReactDOM.render(<CommandlineApp />, root); 
}