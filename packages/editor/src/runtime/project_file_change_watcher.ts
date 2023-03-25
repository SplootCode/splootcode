import {
  ChildSetMutation,
  NodeMutation,
  NodeMutationType,
  Project,
  SerializedNode,
  SplootPackage,
  ValidationWatcher,
  globalMutationDispatcher,
} from '@splootcode/core'
import { FileChangeWatcher, FileSpec } from './file_change_watcher'

export class ProjectFileChangeWatcher implements FileChangeWatcher {
  project: Project
  pkg: SplootPackage
  validationWatcher: ValidationWatcher
  setDirty: () => void

  constructor(project: Project, pkg: SplootPackage, validatioWatcher: ValidationWatcher) {
    this.project = project
    this.pkg = pkg
    this.validationWatcher = validatioWatcher
    this.setDirty = null
  }

  isValid(): boolean {
    return this.validationWatcher.isValid()
  }

  async getAllFileState(): Promise<Map<string, FileSpec>> {
    const result = new Map<string, FileSpec>()
    for (const filename of this.pkg.fileOrder) {
      const file = await this.pkg.getLoadedFile(this.project.fileLoader, filename)
      file.rootNode.recursivelySetLineNumbers(1)
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

  registerObservers(setDirty: () => void) {
    this.setDirty = setDirty
    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
  }

  deregisterObservers() {
    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
    this.setDirty = null
  }
}
