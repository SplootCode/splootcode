import './app.css'

import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { ProjectEditor } from './pages/project_editor'
import { UserHomePage } from './pages/user_home'

export class App extends React.Component {
  render() {
    return (
      <div>
        <BrowserRouter>
          <Switch>
            <Route exact path="/">
              <UserHomePage />
            </Route>
            <Route path="/p/:ownerID/:projectID">
              <ProjectEditor />
            </Route>
          </Switch>
        </BrowserRouter>
      </div>
    )
  }
}
