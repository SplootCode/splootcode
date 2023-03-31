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
  private dependencies: Map<string, string>
  private waitingForDependencies = false
  private dependenciesLoadedAtLeastOnce = false

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
    if (!this.dependenciesLoadedAtLeastOnce) {
      if (this.waitingForDependencies) {
        this.waitingForDependencies = false

        this.sendMessage({
          type: 'load_dependencies',
          dependencies,
        })

        this.dependenciesLoadedAtLeastOnce = true
        console.log('AUTOCOMPLETE deps loaded at least once!')
      }

      this.dependencies = dependencies
    } else {
      this.restartWithDependencies(dependencies)
    }
  }

  restartWithDependencies(dependencies: Map<string, string>) {
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

        this.dependenciesLoadedAtLeastOnce = true
      }
    } else if (type === 'expression_type_info') {
      this.sendToParentWindow(event.data)
    } else {
      console.warn(`Unrecognised message from autocomplete worker: ${type}`)
    }
  }
}
