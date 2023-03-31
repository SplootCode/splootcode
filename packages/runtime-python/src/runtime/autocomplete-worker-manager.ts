import { AutocompleteWorkerMessage, WorkerManagerAutocompleteMessage } from './common'

import { EditorMessage } from '../message_types'
import { ExpressionTypeRequest, ParseTrees } from '@splootcode/language-python'

// TODO(harrison): create a dedicated function for passing through events to the worker?
// Reassess once autocomplete interface is fleshed out.
export class AutocompleteWorkerManager {
  private AutocompleteWorker: new () => Worker
  private worker: Worker
  private workerReady: boolean
  private sendToParentWindow: (payload: EditorMessage) => void
  dependencies: Map<string, string>

  constructor(AutocompleteWorker: new () => Worker, sendToParentWindow: (payload: EditorMessage) => void) {
    this.AutocompleteWorker = AutocompleteWorker
    this.sendToParentWindow = sendToParentWindow
    this.worker = null
    this.workerReady = false
    this.dependencies = null

    this.initializeWorker()
  }

  sendDependencies() {
    if (!this.workerReady) {
      console.error('trying to send deps when worker isnt ready')

      return
    }
    console.log('sending dependencies to worker')
    this.sendMessage({
      type: 'load_dependencies',
      dependencies: this.dependencies,
    })
  }

  initializeWorker() {
    if (!this.worker) {
      this.worker = new this.AutocompleteWorker()
      this.worker.addEventListener('message', this.handleMessageFromWorker)
    }
  }

  restart() {
    this.worker.removeEventListener('message', this.handleMessageFromWorker)
    this.worker.terminate()
    this.worker = null

    this.initializeWorker()
  }

  sendMessage(message: WorkerManagerAutocompleteMessage) {
    this.worker.postMessage(message)
  }

  sendParseTrees(parseTrees: ParseTrees) {
    this.sendMessage({
      type: 'parse_trees',
      parseTrees,
    })
  }

  requestExpressionTypeInfo(request: ExpressionTypeRequest) {
    this.sendMessage({
      type: 'request_expression_type_info',
      request,
    })
  }

  handleMessageFromWorker = (event: MessageEvent<AutocompleteWorkerMessage>) => {
    const type = event.data.type

    if (type === 'ready') {
      this.workerReady = true

      console.log('loading autocomiplete deps')

      if (this.dependencies) {
        this.sendDependencies()
      } else {
        console.log('cant send deps')
      }
    } else if (type === 'expression_type_info') {
      this.sendToParentWindow(event.data)
    } else {
      console.warn(`Unrecognised message from autocomplete worker: ${type}`)
    }
  }
}
