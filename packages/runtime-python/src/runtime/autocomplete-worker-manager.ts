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

  constructor(AutocompleteWorker: new () => Worker, sendToParentWindow: (payload: EditorMessage) => void) {
    this.AutocompleteWorker = AutocompleteWorker
    this.sendToParentWindow = sendToParentWindow
    this.workerReady = false

    this.initialize()
  }

  initialize() {
    if (!this.worker) {
      this.worker = new this.AutocompleteWorker()
      this.worker.addEventListener('message', this.handleMessageFromWorker)
    }
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
    } else if (type === 'expression_type_info') {
      this.sendToParentWindow(event.data)
    } else {
      console.warn(`Unrecognised message from autocomplete worker: ${type}`)
    }
  }
}
