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
  waitingForDependencies = false

  constructor(AutocompleteWorker: new () => Worker, sendToParentWindow: (payload: EditorMessage) => void) {
    this.AutocompleteWorker = AutocompleteWorker
    this.sendToParentWindow = sendToParentWindow
    this.worker = null
    this.workerReady = false
    this.dependencies = null
    this.waitingForDependencies = false

    this.initializeWorker()
  }

  initializeWorker() {
    if (!this.worker) {
      this.worker = new this.AutocompleteWorker()
      this.worker.addEventListener('message', this.handleMessageFromWorker)
      this.waitingForDependencies = false
    }
  }

  loadDependencies(dependencies: Map<string, string>) {
    if (!this.dependencies) {
      this.sendDependenciesOrDelay(dependencies)
    } else {
      this.reloadDependencies(dependencies)
    }
  }

  reloadDependencies(dependencies: Map<string, string>) {
    this.dependencies = dependencies

    this.worker.removeEventListener('message', this.handleMessageFromWorker)
    this.worker.terminate()
    this.worker = null
    this.waitingForDependencies = false

    this.initializeWorker()
  }

  sendMessage(message: WorkerManagerAutocompleteMessage) {
    this.worker.postMessage(message)
  }

  sendDependenciesOrDelay(dependencies: Map<string, string>) {
    if (this.waitingForDependencies) {
      this.waitingForDependencies = false

      this.sendMessage({
        type: 'load_dependencies',
        dependencies,
      })
    }

    this.dependencies = dependencies
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

      if (!this.dependencies) {
        this.waitingForDependencies = true
      } else {
        this.sendMessage({
          type: 'load_dependencies',
          dependencies: this.dependencies,
        })
      }
    } else if (type === 'expression_type_info') {
      this.sendToParentWindow(event.data)
    } else {
      console.warn(`Unrecognised message from autocomplete worker: ${type}`)
    }
  }
}
