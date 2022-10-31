import 'focus-visible/dist/focus-visible'
import 'tslib'
import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './app'
import { AppProviders } from './providers'
import { loadPythonTypes } from '@splootcode/language-python'
import { preloadFonts } from '@splootcode/editor/layout/layout_constants'

import '@splootcode/components/styles.css'

const root = document.getElementById('app-root')

// Force the web font to be loaded as soon as the page loads (before we try to render the editor).
preloadFonts()
// Load all the types
loadPythonTypes()

ReactDOM.render(
  <AppProviders>
    <App />
  </AppProviders>,
  root
)
