import React, { Component } from 'react'
import { PageEditor } from './pages/pageeditor';

import './app.css';
import { observer } from 'mobx-react';

@observer
export class App extends Component {
  render() {
    return (
      <div>
        <PageEditor/>
      </div>
    );
  }
}
