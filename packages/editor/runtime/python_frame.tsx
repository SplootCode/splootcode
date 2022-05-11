import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { ChildSetMutation } from '@splootcode/core/language/mutations/child_set_mutations'
import { NodeMutation, NodeMutationType } from '@splootcode/core/language/mutations/node_mutations'
import { SplootPackage } from '@splootcode/core/language/projects/package'
import { ValidationWatcher } from '@splootcode/core/language/validation/validation_watcher'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

import './python_frame.css'
import {
  CapturePayload,
  FunctionDeclarationData,
  StatementCapture,
} from '@splootcode/core/language/capture/runtime_capture'
import { PythonFile } from '@splootcode/core/language/types/python/python_file'
import { PythonModuleSpec } from '@splootcode/core/language/scope/python'
import { ScopeMutation, ScopeMutationType } from '@splootcode/core/language/mutations/scope_mutations'
import { allRegisteredFunctionIDs, getRegisteredFunction } from '@splootcode/core/language/scope/scope'

export enum FrameState {
  DEAD = 0,
  LOADING,
  LIVE,
  UNMOUNTED,
}

const FRAME_VIEW_DOMAIN = process.env.FRAME_VIEW_DOMAIN
const FRAME_VIEW_SCHEME = process.env.FRAME_VIEW_SCHEME

function getFrameDomain() {
  return FRAME_VIEW_SCHEME + '://' + FRAME_VIEW_DOMAIN
}

function getFrameSrc() {
  const rand = Math.floor(Math.random() * 1000000 + 1)
  return getFrameDomain() + '/splootframepythonclient.html' + '?a=' + rand
}

type ViewPageProps = {
  pkg: SplootPackage
  validationWatcher: ValidationWatcher
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
          src={getFrameSrc()}
          width={480}
          height={700}
          allow="cross-origin-isolated"
        />
      </div>
    )
  }

  postMessageToFrame(payload: object) {
    try {
      this.frameRef.current.contentWindow.postMessage(payload, getFrameDomain())
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
        this.frameRef.current.src = getFrameSrc()
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
    file.rootNode.getScope().loadAllImportedModules()
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
    pythonFile.getScope(false).processPythonModuleSpec(payload)
  }

  processMessage = (event: MessageEvent) => {
    if (event.origin === getFrameDomain()) {
      this.handleMessageFromFrame(event)
    }
  }

  handleMessageFromFrame(event: MessageEvent) {
    const type = event.data.type as string
    if (event.origin !== getFrameDomain()) {
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
        for (const funcID in capture.detached) {
          const funcNode = getRegisteredFunction(funcID)
          const funcDeclarationStatement: StatementCapture = {
            type: 'PYTHON_FUNCTION_DECLARATION',
            data: {
              calls: capture.detached[funcID],
            } as FunctionDeclarationData,
          }
          funcNode.recursivelyApplyRuntimeCapture(funcDeclarationStatement)
        }
        for (const funcID of allRegisteredFunctionIDs()) {
          if (!(funcID in capture.detached)) {
            getRegisteredFunction(funcID)?.recursivelyClearRuntimeCapture()
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
