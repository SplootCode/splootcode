import {
  CapturePayload,
  ChildSetMutation,
  FunctionDeclarationData,
  NodeMutation,
  NodeMutationType,
  Project,
  ProjectMutation,
  ProjectMutationType,
  ScopeMutation,
  ScopeMutationType,
  SerializedNode,
  SplootPackage,
  StatementCapture,
  ValidationWatcher,
  globalMutationDispatcher,
} from '@splootcode/core'
import { FileChangeWatcher, FileSpec } from './file_change_watcher'
import { PythonFile, PythonModuleSpec, PythonScope } from '@splootcode/language-python'

export class ProjectFileChangeWatcher implements FileChangeWatcher {
  project: Project
  pkg: SplootPackage
  validationWatcher: ValidationWatcher
  setDirty: () => void
  refreshProjectRunSettings: () => void
  loadModule: (moduleName: string) => void

  constructor(project: Project, pkg: SplootPackage, validatioWatcher: ValidationWatcher) {
    this.project = project
    this.pkg = pkg
    this.validationWatcher = validatioWatcher
    this.setDirty = null
    this.refreshProjectRunSettings = null
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

  isValid(): boolean {
    return this.validationWatcher.isValid()
  }

  async getAllFileState(): Promise<Map<string, FileSpec>> {
    const result = new Map<string, FileSpec>()
    for (const filename of this.pkg.fileOrder) {
      const file = await this.pkg.getLoadedFile(this.project.fileLoader, filename)
      const content: SerializedNode = file.rootNode.serialize()
      result.set(filename, { type: 'sploot', content: content })
    }
    return result
  }

  async getUpdatedFileState(): Promise<Map<string, FileSpec>> {
    return await this.getAllFileState()
  }

  getEnvVars(): Map<string, string> {
    const varsSimplified = new Map()
    for (const [key, value] of this.project.environmentVars) {
      varsSimplified.set(key, value[0])
    }
    return varsSimplified
  }

  handleNodeMutation = (mutation: NodeMutation) => {
    // There's a node tree version we've not loaded yet.
    if (mutation.type !== NodeMutationType.SET_VALIDITY) {
      // Only trigger for actual code changes
      // The validation mutations always get sent before the actual code change.
      this.setDirty()
    }
  }

  handleChildSetMutation = (mutation: ChildSetMutation) => {
    // There's a node tree version we've not loaded yet.
    this.setDirty()
  }

  onPythonRuntimeIsReady = async () => {
    const file = await this.pkg.getLoadedFile(this.project.fileLoader, 'main.py')
    ;(file.rootNode as PythonFile).getScope().loadAllImportedModules()
  }

  handleScopeMutation = async (mutation: ScopeMutation) => {
    if (mutation.type === ScopeMutationType.IMPORT_MODULE) {
      this.loadModule(mutation.moduleName)
    }
    // TODO: Deal with a rename better than we currently do.
    // this.scanForHandlerFunctions()
  }

  handleProjectMutation = (mutation: ProjectMutation) => {
    if (mutation.type === ProjectMutationType.UPDATE_RUN_SETTINGS) {
      this.refreshProjectRunSettings()
    }
    this.setDirty()
  }

  async recievedModuleInfo(payload: PythonModuleSpec) {
    const file = await this.pkg.getLoadedFile(this.project.fileLoader, 'main.py')
    const pythonFile = file.rootNode as PythonFile
    ;(pythonFile.getScope(false) as PythonScope).processPythonModuleSpec(payload)
  }

  registerObservers(
    setDirty: () => void,
    loadModule: (moduleName: string) => void,
    refreshProjectRunSettings: () => void
  ) {
    this.setDirty = setDirty
    this.loadModule = loadModule
    this.refreshProjectRunSettings = refreshProjectRunSettings
    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
    globalMutationDispatcher.registerScopeObserver(this)
    globalMutationDispatcher.registerProjectObserver(this)
  }

  deregisterObservers() {
    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
    globalMutationDispatcher.deregisterScopeObserver(this)
    globalMutationDispatcher.deregisterProjectObserver(this)
    this.setDirty = null
    this.loadModule = null
    this.refreshProjectRunSettings = null
  }
}
