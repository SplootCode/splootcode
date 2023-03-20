import React, { Component } from 'react'
import { PythonFrame, RuntimeToken } from './python_frame'
import { RuntimeContextManager } from 'src/context/runtime_context_manager'

export type RuntimePanelProps = {
  frameScheme: 'http' | 'https'
  frameDomain: string
  refreshToken?: () => Promise<RuntimeToken>
  runtimeContextManager: RuntimeContextManager
}

interface RuntimePanelState {}

export class PythonRuntimePanel extends Component<RuntimePanelProps, RuntimePanelState> {
  constructor(props: RuntimePanelProps) {
    super(props)
  }

  render() {
    const { frameScheme, frameDomain, runtimeContextManager, refreshToken } = this.props
    return (
      <PythonFrame
        runtimeContextManager={runtimeContextManager}
        frameDomain={frameDomain}
        frameScheme={frameScheme}
        refreshToken={refreshToken}
      />
    )
  }
}
