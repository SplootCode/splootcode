import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { PageEditor } from './pages/pageeditor'

import './app.css'

@observer
export class App extends Component {
  render() {
    return (
      <div>
        <PageEditor />
      </div>
    )
  }
}
