import {
  CapturePayload,
  FunctionDeclarationData,
  HTTPRequestAWSEvent,
  Project,
  ProjectMutation,
  ProjectMutationType,
  RunSettings,
  RunType,
  ScopeMutation,
  ScopeMutationType,
  SplootPackage,
  StatementCapture,
  globalMutationDispatcher,
  httpScenarioToHTTPRequestEvent,
} from '@splootcode/core'

import {
  EditorMessage,
  RequestExpressionTypeInfoMessage,
  RuntimeMessage,
  SendParseTreeMessage,
  WorkspaceFilesMessage,
} from '@splootcode/runtime-python'
import {
  ExpressionTypeRequest,
  ExpressionTypeResponse,
  ParseTreeCommunicator,
  ParseTreeInfo,
  PythonFile,
  PythonModuleSpec,
  PythonScope,
} from '@splootcode/language-python'
import { FileChangeWatcher, FileSpec } from 'src/runtime/file_change_watcher'
import { FrameStateManager } from 'src/runtime/frame_state_manager'
import { action, observable } from 'mobx'

export class RuntimeContextManager implements ParseTreeCommunicator {
  project: Project
  pkg: SplootPackage
  frameStateManager: FrameStateManager
  fileChangeWatcher: FileChangeWatcher
  textCodePromise: Promise<string>
  onTextCodeRecieved: (code: string) => void
  loadedInitialModules: boolean

  @observable
  ready: boolean
  @observable
  running: boolean
  @observable
  selectedHTTPScenarioID: number | null
  @observable
  runSettings: RunSettings

  sendParseTreeHandler: () => void
  requestExpressionTypeInfoHandler: (resp: ExpressionTypeResponse) => void

  constructor(project: Project, fileChangeWatcher: FileChangeWatcher) {
    this.project = project
    this.pkg = project.getDefaultPackage()
    this.frameStateManager = null
    this.fileChangeWatcher = fileChangeWatcher
    this.ready = false
    this.running = false
    this.selectedHTTPScenarioID = null
    this.runSettings = this.project.runSettings

    if (this.project.runSettings.httpScenarios.length > 0) {
      this.selectedHTTPScenarioID = this.project.runSettings.httpScenarios[0].id
    }
  }

  setRequestExpressionTypeInfoHandler(handler: (resp: ExpressionTypeResponse) => void): void {
    this.requestExpressionTypeInfoHandler = handler
  }

  setSendParseTreeHandler(handler: () => void): void {
    this.sendParseTreeHandler = handler
  }

  updateSelectedHTTPScenarioID(id: number) {
    this.selectedHTTPScenarioID = id
    this.setDirty()
  }

  // Called once the iframe is created, so the context manager can start sending messages.
  registerIFrameAccess(postMessageToFrame: (message: RuntimeMessage) => void, reloadFrame: () => void) {
    this.frameStateManager = new FrameStateManager(postMessageToFrame, reloadFrame, this.sendNodeTreeToHiddenFrame)
    this.fileChangeWatcher.registerObservers(this.setDirty)
    this.frameStateManager.startHeartbeat()
  }

  async getTextCode(): Promise<string> {
    if (this.frameStateManager === null || !this.ready) {
      throw new Error('Cannot get text code until runtime is ready.')
    }

    if (this.running) {
      throw new Error('Cannot get text code while code is running.')
    }

    if (!this.fileChangeWatcher.isValid()) {
      throw new Error(
        'The project code is currently not valid for generating Python code. Please fix the errors or remove the incomplete code.'
      )
    }

    if (this.textCodePromise) {
      return this.textCodePromise
    }

    this.textCodePromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.onTextCodeRecieved = null
        this.textCodePromise = null
        reject(new Error('Timed out while waiting for generation of text code.'))
      }, 5000)
      this.onTextCodeRecieved = (code: string) => {
        clearTimeout(timer)
        this.onTextCodeRecieved = null
        this.textCodePromise = null
        resolve(code)
      }
    })

    this.frameStateManager.postMessage({ type: 'export_text_code' })
    return this.textCodePromise
  }

  // Called if the iframe is to be unmounted, or a new runtime context is passed to the iframe.
  deregisterIFrameAccess() {
    this.frameStateManager.stopHeartbeat()
    this.fileChangeWatcher.deregisterObservers()
    this.frameStateManager = null
  }

  async recievedModuleInfo(payload: PythonModuleSpec) {
    const file = await this.project.getDefaultPackage().getLoadedFile(this.project.fileLoader, 'main.py')
    const pythonFile = file.rootNode as PythonFile
    ;(pythonFile.getScope(false) as PythonScope).processPythonModuleSpec(payload)
  }

  updateRuntimeCaptures(captures: Map<string, CapturePayload>) {
    // TODO: handle mutliple python files or different names.
    for (const filename of captures.keys()) {
      const capture = captures.get(filename)
      this.pkg
        .getLoadedFile(this.project.fileLoader, filename)
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
  }

  loadAllImportedModules = async () => {
    const file = await this.pkg.getLoadedFile(this.project.fileLoader, 'main.py')
    ;(file.rootNode as PythonFile).getScope().loadAllImportedModules()
    this.loadedInitialModules = true
  }

  handleMessageFromRuntime(data: EditorMessage) {
    const type = data.type
    switch (type) {
      case 'heartbeat':
        if (this.frameStateManager) {
          this.frameStateManager.handleHeartbeat(data.data.state)
        }
        break
      case 'runtime_capture':
        const captures = data.captures as Map<string, CapturePayload>
        this.updateRuntimeCaptures(captures)
        break
      case 'module_info':
        this.recievedModuleInfo(data.info)
        break
      case 'text_code_content':
        if (this.onTextCodeRecieved) {
          this.onTextCodeRecieved(data.fileContents.get('main.py'))
        } else {
          console.warn('Recieved text code content message unexpectedly.')
        }
        break
      default:
        console.warn('Unexpected message from frame: ', data)
    }
  }

  @action
  setReady() {
    this.ready = true
    this.running = false
    if (!this.loadedInitialModules) {
      this.loadAllImportedModules()
    }
  }

  isValid() {
    return this.fileChangeWatcher.isValid()
  }

  @action
  run() {
    this.frameStateManager.postMessage({ type: 'run' })
  }

  @action
  setRunning() {
    this.running = true
  }

  @action
  setDisabled() {
    this.running = false
    this.ready = false
  }

  @action
  stop() {
    this.setDisabled()
    this.frameStateManager.postMessage({ type: 'stop' })
  }

  setDirty = () => {
    this.frameStateManager.setNeedsNewNodeTree(true)
  }

  sendNodeTreeToHiddenFrame = async (isInitial: boolean) => {
    this.sendParseTreeHandler()

    let isValid = this.fileChangeWatcher.isValid()
    if (!isValid) {
      this.ready = false
      this.frameStateManager.setNeedsNewNodeTree(false)
      return
    }
    let fileState: Map<string, FileSpec>
    if (isInitial) {
      fileState = await this.fileChangeWatcher.getAllFileState()
    } else {
      fileState = await this.fileChangeWatcher.getUpdatedFileState()
    }

    // Check validity again - if it's not valid, bail out
    isValid = this.fileChangeWatcher.isValid()
    if (!isValid) {
      this.ready = false
      this.frameStateManager.setNeedsNewNodeTree(false)
      return
    }

    const envVars = this.fileChangeWatcher.getEnvVars()

    let event: HTTPRequestAWSEvent = null
    if (this.project.runSettings.runType === RunType.HTTP_REQUEST) {
      const scenario = this.project.runSettings.httpScenarios.find(
        (scenario) => scenario.id === this.selectedHTTPScenarioID
      )

      if (!scenario) {
        this.ready = false
        this.frameStateManager.setNeedsNewNodeTree(false)

        return
      }

      event = httpScenarioToHTTPRequestEvent(scenario)
    }

    const messageType = isInitial ? 'initialfiles' : 'updatedfiles'
    const payload: WorkspaceFilesMessage = {
      type: messageType,
      data: { files: fileState, envVars: envVars },
      runType: this.project.runSettings.runType,
      eventData: event,
    }
    this.frameStateManager.postMessage(payload)
    this.frameStateManager.setNeedsNewNodeTree(false)
  }

  sendParseTree = async (parseTree: ParseTreeInfo) => {
    const payload: SendParseTreeMessage = {
      type: 'sendParseTree',
      parseTree,
    }

    if (!this.frameStateManager) {
      console.warn('FrameStateManager not initialized')
      return
    }

    this.frameStateManager.postMessage(payload)
  }

  requestExpressionTypeInfo = (request: ExpressionTypeRequest) => {
    if (!this.frameStateManager) {
      console.warn('FrameStateManager not initialized')
      return
    }

    const payload: RequestExpressionTypeInfoMessage = {
      type: 'requestExpressionTypeInfo',
      request,
    }

    this.frameStateManager.postMessage(payload)
  }

  handleProjectMutation(mutation: ProjectMutation) {
    if (mutation.type === ProjectMutationType.UPDATE_RUN_SETTINGS) {
      this.runSettings = mutation.newSettings
      this.setDirty()
    }
  }

  handleScopeMutation(mutation: ScopeMutation) {
    if (mutation.type === ScopeMutationType.IMPORT_MODULE) {
      if (this.frameStateManager) {
        this.frameStateManager.postMessage({ type: 'module_info', moduleName: mutation.moduleName })
      }
    }
  }

  registerSelf() {
    globalMutationDispatcher.registerProjectObserver(this)
    globalMutationDispatcher.registerScopeObserver(this)
  }

  deregisterSelf() {
    globalMutationDispatcher.deregisterProjectObserver(this)
    globalMutationDispatcher.deregisterScopeObserver(this)
  }
}
