import {
  ChildSetMutation,
  ChildSetObserver,
  NodeMutation,
  NodeObserver,
  Project,
  ProjectLoader,
  ProjectMutation,
  ProjectObserver,
  SaveError,
  globalMutationDispatcher,
} from '@splootcode/core'
import { action, observable, runInAction } from 'mobx'

export interface AutosaveWatcherFailedSaveInfo {
  title: string
}

export class AutosaveWatcher implements NodeObserver, ChildSetObserver, ProjectObserver {
  @observable
  needsSave: boolean

  @observable
  lastVersion: string

  @observable
  failedSave: boolean
  failedSaveInfo: AutosaveWatcherFailedSaveInfo

  @observable
  needsRefresh: boolean

  failedMessage: string

  project: Project
  projectLoader: ProjectLoader

  timeoutID?: number

  constructor(project: Project, projectLoader: ProjectLoader) {
    this.project = project
    this.lastVersion = this.project.version
    this.projectLoader = projectLoader
    this.needsSave = false
    this.failedSave = false
  }

  handleChildSetMutation(mutations: ChildSetMutation): void {
    this.trigger()
  }

  handleProjectMutation(mutation: ProjectMutation): void {
    this.trigger()
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    this.trigger()
  }

  @action
  trigger() {
    this.needsSave = true

    if (this.timeoutID == null && !this.project?.isReadOnly) {
      this.timeoutID = window.setTimeout(
        () =>
          runInAction(() => {
            this.needsSave = false
            this.timeoutID = null

            this.projectLoader
              .saveProject(this.project)
              .then((success) => {
                if (success) {
                  this.needsSave = false
                  this.failedSave = false
                  this.lastVersion = this.project.version
                } else {
                  this.needsSave = true
                  this.failedSave = true

                  this.failedSaveInfo = {
                    title: 'Failed to save. Reason: Unknown',
                  }
                }
              })
              .catch((err) => {
                if (err instanceof SaveError) {
                  this.failedSave = true

                  this.failedSaveInfo = {
                    title: err.message,
                  }
                } else {
                  throw err
                }
              })
          }),
        2000
      )
    }
  }

  public registerSelf() {
    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
    globalMutationDispatcher.registerProjectObserver(this)
  }

  public deregisterSelf() {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID)
    }

    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
    globalMutationDispatcher.deregisterProjectObserver(this)
  }
}
