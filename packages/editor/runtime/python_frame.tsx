import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { ChildSetMutation } from '@splootcode/core'
import { NodeMutation, NodeMutationType } from '@splootcode/core'
import { SplootPackage } from '@splootcode/core'
import { ValidationWatcher } from '@splootcode/core'
import { globalMutationDispatcher } from '@splootcode/core'

import './python_frame.css'
import { CapturePayload, FunctionDeclarationData, StatementCapture } from '@splootcode/core'
import { PythonFile } from '@splootcode/language-python/nodes/python_file'
import { PythonModuleSpec } from '@splootcode/language-python/scope/python'
import { PythonScope } from '@splootcode/language-python/scope/python_scope'
import { ScopeMutation, ScopeMutationType } from '@splootcode/core'

export enum FrameState {
  DEAD = 0,
  LOADING,
  LIVE,
  UNMOUNTED,
}

type ViewPageProps = {
  pkg: SplootPackage
  validationWatcher: ValidationWatcher
  frameScheme: 'http' | 'https'
  frameDomain: string
}

@observer
export class PythonFrame extends Component<ViewPageProps> {
  private frameRef: React.RefObject<HTMLIFrameElement>
  private lastHeartbeatTimestamp: Date
  private lastSentNodeTree: Date
  private needsNewNodeTree: boolean
  private frameState: FrameState

  constructor(props: ViewPageProps) {
    super(props)
    this.frameRef = React.createRef()
    this.frameState = FrameState.LOADING
    this.lastHeartbeatTimestamp = new Date()
    this.lastSentNodeTree = new Date(new Date().getMilliseconds() - 1000)
    this.needsNewNodeTree = false
  }

  render() {
    this.needsNewNodeTree = true
    return (
      <div id="python-frame-container">
        <iframe
          ref={this.frameRef}
          id="view-python-frame"
          src={this.getFrameSrc()}
          width={480}
          height={700}
          allow="cross-origin-isolated"
        />
      </div>
    )
  }

  getFrameDomain = () => {
    return this.props.frameScheme + '://' + this.props.frameDomain
  }

  getFrameSrc = () => {
    const rand = Math.floor(Math.random() * 1000000 + 1)
    return this.getFrameDomain() + '/splootframepythonclient.html' + '?a=' + rand
  }

  postMessageToFrame(payload: object) {
    try {
      this.frameRef.current.contentWindow.postMessage(payload, this.getFrameDomain())
    } catch (error) {
      console.warn(error)
    }
  }

  checkHeartbeatFromFrame = () => {
    if (this.frameState === FrameState.UNMOUNTED) {
      return
    }
    const now = new Date()
    const millis = now.getTime() - this.lastHeartbeatTimestamp.getTime()
    if (millis > 30000) {
      this.frameState = FrameState.DEAD
    }
    switch (this.frameState) {
      case FrameState.LOADING:
        this.sendNodeTreeToHiddenFrame()
        break
      case FrameState.LIVE:
        if (this.needsNewNodeTree) {
          this.sendNodeTreeToHiddenFrame()
        } else {
          this.sendHeartbeatRequest()
        }
        break
      case FrameState.DEAD:
        console.warn('frame is dead, reloading')
        this.frameRef.current.src = this.getFrameSrc()
        this.frameState = FrameState.LOADING
        this.lastHeartbeatTimestamp = new Date()
        break
    }
    setTimeout(() => {
      this.checkHeartbeatFromFrame()
    }, 2000) // 2s
  }

  handleNodeMutation = (mutation: NodeMutation) => {
    // There's a node tree version we've not loaded yet.
    if (mutation.type !== NodeMutationType.SET_VALIDITY) {
      // Only trigger for actual code changes
      // The validation mutations always get sent before the actual code change.
      this.needsNewNodeTree = true
      this.sendNodeTreeToHiddenFrame()
    }
  }

  handleChildSetMutation = (mutation: ChildSetMutation) => {
    // There's a node tree version we've not loaded yet.
    this.needsNewNodeTree = true
    this.sendNodeTreeToHiddenFrame()
  }

  onPythonRuntimeIsReady = async () => {
    const file = await this.props.pkg.getLoadedFile('main.py')
    ;(file.rootNode as PythonFile).getScope().loadAllImportedModules()
  }

  handleScopeMutation = (mutation: ScopeMutation) => {
    if (mutation.type === ScopeMutationType.IMPORT_MODULE) {
      this.postMessageToFrame({
        type: 'module_info',
        moduleName: mutation.moduleName,
      })
    }
  }

  async recievedModuleInfo(payload: PythonModuleSpec) {
    const file = await this.props.pkg.getLoadedFile('main.py')
    const pythonFile = file.rootNode as PythonFile
    ;(pythonFile.getScope(false) as PythonScope).processPythonModuleSpec(payload)
  }

  processMessage = (event: MessageEvent) => {
    if (event.origin === this.getFrameDomain()) {
      this.handleMessageFromFrame(event)
    }
  }

  handleMessageFromFrame(event: MessageEvent) {
    const type = event.data.type as string
    if (event.origin !== this.getFrameDomain()) {
      return
    }
    if (!event.data.type) {
      return
    }
    if (type.startsWith('webpack')) {
      // Ignore webpack devserver events for local dev
      return
    }
    switch (type) {
      case 'heartbeat':
        this.frameState = event.data.data['state']
        this.lastHeartbeatTimestamp = new Date()
        break
      case 'ready':
        this.onPythonRuntimeIsReady()
        break
      case 'runtime_capture':
        const capture = JSON.parse(event.data.capture) as CapturePayload
        this.updateRuntimeCapture(capture)
        break
      case 'module_info':
        this.recievedModuleInfo(event.data.info)
        break
      default:
        console.warn('Unknown event from frame: ', event)
    }
  }

  updateRuntimeCapture(capture: CapturePayload) {
    // TODO: handle mutliple python files or different names.
    const filename = 'main.py'
    this.props.pkg
      .getLoadedFile(filename)
      .then((file) => {
        file.rootNode.recursivelyApplyRuntimeCapture(capture.root)
        const scope = (file.rootNode as PythonFile).getScope()
        for (const funcID in capture.detached) {
          const funcNode = scope.getRegisteredFunction(funcID)
          const funcDeclarationStatement: StatementCapture = {
            type: 'PYTHON_FUNCTION_DECLARATION',
            data: {
              calls: capture.detached[funcID],
            } as FunctionDeclarationData,
          }
          funcNode.recursivelyApplyRuntimeCapture(funcDeclarationStatement)
        }
        for (const funcID of scope.allRegisteredFunctionIDs()) {
          if (!(funcID in capture.detached)) {
            scope.getRegisteredFunction(funcID)?.recursivelyClearRuntimeCapture()
          }
        }
      })
      .catch((err) => {
        console.warn(err)
        console.warn(`Failed to apply runtime capture`)
      })
  }

  sendHeartbeatRequest() {
    const payload = { type: 'heartbeat' }
    this.postMessageToFrame(payload)
  }

  async sendNodeTreeToHiddenFrame() {
    const now = new Date()
    const millis = now.getTime() - this.lastSentNodeTree.getTime()
    const pkg = this.props.pkg

    // Rate limit: Only send if it's been some time since we last sent.
    if (millis > 200) {
      if (!this.props.validationWatcher.isValid()) {
        this.lastSentNodeTree = now
        this.needsNewNodeTree = false
        this.postMessageToFrame({ type: 'disable' })
        return
      }

      pkg.fileOrder.forEach((filename) => {
        pkg.getLoadedFile(filename).then((file) => {
          const payload = { type: 'nodetree', data: { filename: file.name, tree: file.rootNode.serialize() } }
          // Check again that the current state is valid - otherwise bail out
          if (this.props.validationWatcher.isValid()) {
            this.postMessageToFrame(payload)
          } else {
            this.postMessageToFrame({ type: 'disable' })
          }
          this.lastSentNodeTree = now
          this.needsNewNodeTree = false
          return
        })
      })
    }
  }

  componentDidMount() {
    this.frameState = FrameState.LOADING
    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
    globalMutationDispatcher.registerScopeObserver(this)
    window.addEventListener('message', this.processMessage, false)

    // trigger background process to wait for a response
    setTimeout(() => {
      this.checkHeartbeatFromFrame()
    }, 1000)
  }

  componentWillUnmount() {
    this.frameState = FrameState.UNMOUNTED
    window.removeEventListener('message', this.processMessage, false)

    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
    globalMutationDispatcher.deregisterScopeObserver(this)
  }
}
