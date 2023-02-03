import React, { Component } from 'react'
import { FileChangeWatcher } from './file_change_watcher'
import { Project, SplootPackage, ValidationWatcher } from '@splootcode/core'
import { ProjectFileChangeWatcher } from './project_file_change_watcher'
import { PythonFrame, RuntimeToken } from './python_frame'

export type RuntimePanelProps = {
  project: Project
  pkg: SplootPackage
  validationWatcher: ValidationWatcher
  frameScheme: 'http' | 'https'
  frameDomain: string
  refreshToken?: () => Promise<RuntimeToken>
}

interface RuntimePanelState {
  fileChangeWatcher: FileChangeWatcher
}

export class PythonRuntimePanel extends Component<RuntimePanelProps, RuntimePanelState> {
  constructor(props: RuntimePanelProps) {
    super(props)
    this.state = {
      fileChangeWatcher: new ProjectFileChangeWatcher(props.project, props.pkg, props.validationWatcher),
    }
  }

  render() {
    const { frameScheme, frameDomain, refreshToken } = this.props
    const fileChangeWatcher = this.state.fileChangeWatcher
    return (
      <PythonFrame
        fileChangeWatcher={fileChangeWatcher}
        frameDomain={frameDomain}
        frameScheme={frameScheme}
        refreshToken={refreshToken}
      />
    )
  }
}
