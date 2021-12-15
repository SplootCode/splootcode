import 'focus-visible/dist/focus-visible'
import 'tslib'
import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './app'
import { AppProviders } from './providers'
import { stringWidth } from '@splootcode/editor/layout/rendered_childset_block'

const root = document.getElementById('app-root')

// Force the web font to be loaded as soon as the page loads (before we try to render the editor).
stringWidth('loadfontplz')

ReactDOM.render(
  <AppProviders>
    <App />
  </AppProviders>,
  root
)
