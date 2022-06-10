import 'focus-visible/dist/focus-visible'
import 'tslib'
import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './app'
import { AppProviders } from './providers'
import { loadTypes } from '@splootcode/core/language/type_loader'
import { stringWidth } from '@splootcode/editor/layout/layout_constants'

const root = document.getElementById('app-root')

// Force the web font to be loaded as soon as the page loads (before we try to render the editor).
stringWidth('loadfontplz')
// Load all the types
loadTypes()

ReactDOM.render(
  <AppProviders>
    <App />
  </AppProviders>,
  root
)
