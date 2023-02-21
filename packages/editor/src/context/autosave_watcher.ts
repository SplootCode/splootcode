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

  handleFail: () => void

  constructor(project: Project, projectLoader: ProjectLoader, handleFail: () => void) {
    this.project = project
    this.lastVersion = this.project.version
    this.projectLoader = projectLoader
    this.handleFail = handleFail

    this.timeoutIDs = []

    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
    globalMutationDispatcher.registerProjectObserver(this)

    this.ensureUpToDate()
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

    if (this.needsSave && !this.project?.isReadOnly) {
      // TODO(harrison): handle these IDs
      const id = setTimeout(
        () =>
          runInAction(() => {
            this.removeTimeoutID(id)

            // this.ensureUpToDate()

            if (this.needsSave) {
              this.projectLoader
                .saveProject(this.project)
                .then((success) => {
                  // this.handleFail()

                  if (success) {
                    this.needsSave = false
                    this.failedSave = false
                    this.lastVersion = this.project.version
                  } else {
                    this.needsSave = true
                    this.failedSave = true

                    // this.handleFail()

                    // TODO(harrison): properly implement this toast
                    // toast({
                    //   title: 'Failed to save. Reason: Unknown',
                    //   position: 'top',
                    //   status: 'warning',
                    // })
                  }
                })
                .catch((err) => {
                  if (err instanceof SaveError) {
                    this.failedSave = true

                    // this.handleFail()
                    // TODO(harrison): properly implement this failed save
                    // toast({
                    //   title: err.message,
                    //   position: 'top',
                    //   status: 'warning',
                    // })
                    // setFailedSave(true)
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

  // TODO(harrison): make sure this runs correctly
  ensureUpToDate() {
    if (!this.needsSave && !this.project?.isReadOnly) {
      const checkVersion = async () => {
        if (document['hidden'] === false) {
          const isCurrent = await this.projectLoader.isCurrentVersion(this.project)
          if (!isCurrent) {
            console.log('not up to date?')
            this.handleFail()
          }
        }
      }
      window.addEventListener('visibilitychange', checkVersion)
      return () => {
        window.removeEventListener('visibilitychange', checkVersion)
      }
    }
  }

  removeTimeoutID(id: number) {
    const i = this.timeoutIDs.indexOf(id)
    if (i < 0) {
      return
    }

    this.timeoutIDs.splice(i, 1)
  }

  public registerSelf() {}

  public deregisterSelf() {
    for (const timeoutID of this.timeoutIDs) {
      clearInterval(timeoutID as any)
    }

    this.timeoutIDs = []

    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
    globalMutationDispatcher.deregisterProjectObserver(this)
  }
}
