import {
  ChildSetMutation,
  NodeMutation,
  NodeMutationType,
  SerializedNode,
  SplootNode,
  globalMutationDispatcher,
} from '@splootcode/core'
import { NodeSelection } from './selection'

const MaxUndoSnapshots = 30

export class UndoWatcher {
  rootNode: SplootNode
  selection: NodeSelection
  currentSnapshotID: number
  latestSnapshotID: number
  currentSnapshot: SerializedNode
  undoSnapshots: SerializedNode[]
  redoSnapshots: SerializedNode[]
  loadNewRootNode: (rootNode: SplootNode) => void
  enabled: boolean
  timeoutID: number

  constructor() {
    this.rootNode = null
    this.currentSnapshotID = null
    this.currentSnapshot = null
    this.undoSnapshots = []
    this.redoSnapshots = []
    this.enabled = true
    this.timeoutID = null
  }

  undo() {
    // No undo snapshots to use.
    if (this.undoSnapshots.length == 0) {
      return
    }
    // Remove current snapshot
    const newSnapshot = this.undoSnapshots.shift()
    // Put current snapshot on the redo stack
    this.redoSnapshots.unshift(this.currentSnapshot)
    this.currentSnapshot = newSnapshot

    // Disable undo shapshotting (but not other mutation firing) and recursively apply the snapshot as edits.
    this.enabled = false
    this.rootNode.applySerializedSnapshot(this.currentSnapshot)
    this.enabled = true
  }

  redo() {
    // No redo snapshots to use.
    if (this.redoSnapshots.length == 0) {
      return
    }
    // Remove current snapshot
    const newSnapshot = this.redoSnapshots.shift()
    // Put current snapshot on the undo stack
    this.undoSnapshots.unshift(this.currentSnapshot)
    this.currentSnapshot = newSnapshot

    // Disable undo shapshotting (but not other mutation firing) and recursively apply the snapshot as edits.
    this.enabled = false
    this.rootNode.applySerializedSnapshot(this.currentSnapshot)
    this.enabled = true
  }

  setRootNode(rootNode: SplootNode) {
    this.rootNode = rootNode
    this.enabled = true
    this.triggerSnapshot()
  }

  triggerSnapshot(delay = 0) {
    if (!this.enabled) {
      return
    }
    this.latestSnapshotID = Math.random()
    if (!this.timeoutID) {
      this.timeoutID = window.setTimeout(this.takeSnapshot, delay)
    }
  }

  takeSnapshot = async () => {
    if (this.currentSnapshotID == this.latestSnapshotID) {
      return
    }
    this.timeoutID = null
    this.currentSnapshotID = this.latestSnapshotID
    const newSnapshot = this.rootNode.serialize(true)
    if (this.currentSnapshot) {
      this.undoSnapshots.unshift(this.currentSnapshot)
    }
    this.currentSnapshot = newSnapshot
    this.redoSnapshots = []
    while (this.undoSnapshots.length > MaxUndoSnapshots) {
      this.undoSnapshots.pop()
    }
  }

  handleChildSetMutation(mutations: ChildSetMutation): void {
    this.triggerSnapshot()
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    // Don't update on validation mutations or runtime annotations.
    if (nodeMutation.type == NodeMutationType.SET_PROPERTY) {
      // Wait longer on set property mutations since there's likely more of them.
      this.triggerSnapshot(1000)
    }
  }

  public registerSelf() {
    globalMutationDispatcher.registerChildSetObserver(this)
    globalMutationDispatcher.registerNodeObserver(this)
  }

  public deregisterSelf() {
    window.clearTimeout(this.timeoutID)
    globalMutationDispatcher.deregisterChildSetObserver(this)
    globalMutationDispatcher.deregisterNodeObserver(this)
  }
}
