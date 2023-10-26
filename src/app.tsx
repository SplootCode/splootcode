import './app.css'

import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { LocalStorageProjectLoader, Tongue } from '@splootcode/core'
import { ProjectEditor } from './pages/project_editor'
import { UserHomePage } from './pages/user_home'

export class App extends React.Component {
  localStorageProjectLoader = new LocalStorageProjectLoader()
  tongue = Tongue.it

  render() {
    return (
      <div>
        <BrowserRouter>
          <Switch>
            <Route exact path="/">
              <UserHomePage projectLoader={this.localStorageProjectLoader} />
            </Route>
            <Route path="/p/:ownerID/:projectID">
              <ProjectEditor projectLoader={this.localStorageProjectLoader} tongue={this.tongue} />
            </Route>
          </Switch>
        </BrowserRouter>
      </div>
    )
  }
}
