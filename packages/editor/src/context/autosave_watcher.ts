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
} from '@splootcode/core/'
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
  @observable
  needsRefresh: boolean

  failedMessage: string

  project: Project
  projectLoader: ProjectLoader

  timeoutIDs: number[]

  handleRefreshProject: () => void
  handleFailedSave: (AutosaveWatcherFailedSaveInfo) => void

  ensureLatestVersionHandler: () => Promise<void>

  constructor(
    project: Project,
    projectLoader: ProjectLoader,
    handleRefreshProject: () => void,
    handleFailedSave: (AutosaveWatcherFailedSaveInfo) => void
  ) {
    this.project = project
    this.lastVersion = this.project.version
    this.projectLoader = projectLoader
    this.handleRefreshProject = handleRefreshProject
    this.needsSave = false
    this.failedSave = false
    this.handleFailedSave = handleFailedSave

    this.timeoutIDs = []
  }

  handleChildSetMutation(mutations: ChildSetMutation): void {
    console.log('childset mutation')
    this.trigger()
  }

  handleProjectMutation(mutation: ProjectMutation): void {
    console.log('childset mutation')

    this.trigger()
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    console.log('childset mutation')

    this.trigger()
  }

  @action
  trigger() {
    this.needsSave = true

    if (this.needsSave && !this.project?.isReadOnly) {
      // TODO(harrison): handle these IDs
      const id = setTimeout(
        () =>
          runInAction(() => {
            this.removeTimeoutID(id)

            if (this.needsSave) {
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

                    this.handleFailedSave({
                      title: 'Failed to save. Reason: Unknown',
                    })
                  }
                })
                .catch((err) => {
                  if (err instanceof SaveError) {
                    this.failedSave = true

                    this.handleFailedSave({
                      title: err.message,
                    })
                  } else {
                    throw err
                  }
                })
            }
          }),
        2000
      ) as unknown as number

      this.timeoutIDs.push(id)
    }
  }

  ensureLatestVersion() {
    if (!this.ensureLatestVersionHandler) {
      this.ensureLatestVersionHandler = async () => {
        if (this.project.isReadOnly) {
          return
        }

        if (document['hidden'] === false) {
          const isCurrent = await this.projectLoader.isCurrentVersion(this.project)
          if (!isCurrent) {
            this.handleRefreshProject()
          }
        }
      }
    }

    return this.ensureLatestVersionHandler
  }

  removeTimeoutID(id: number) {
    const i = this.timeoutIDs.indexOf(id)
    if (i < 0) {
      return
    }

    this.timeoutIDs.splice(i, 1)
  }

  public registerSelf() {
    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
    globalMutationDispatcher.registerProjectObserver(this)
    window.addEventListener('visibilitychange', this.ensureLatestVersion())
  }

  public deregisterSelf() {
    for (const timeoutID of this.timeoutIDs) {
      clearInterval(timeoutID as any)
    }

    this.timeoutIDs = []

    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
    globalMutationDispatcher.deregisterProjectObserver(this)

    window.removeEventListener('visibilitychange', this.ensureLatestVersion())
  }
}
