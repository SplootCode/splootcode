import { FrameState, RuntimeMessage } from '@splootcode/runtime-python'

const HeartbeatCheckInterval = 1000 // Check every 1s
const HeartbeatSendInterval = 20000 // Request heartbeat every 20s
const HeartbeatTimeout = 60000 // Die if no heartbeat for 1 min

export class FrameStateManager {
  private lastHeartbeatTimestamp: Date
  private frameState: FrameState
  private postMessageToFrame: (message: RuntimeMessage) => void
  private sendNodeTreeToHiddenFrame: (initialSend: boolean) => void
  private reloadFrame: () => void
  private currentHeartbeat = null
  private needsNewNodeTree = false
  private lastSentNodeTree = new Date()

  constructor(
    postMessageToFrame: (message: RuntimeMessage) => void,
    reloadFrame: () => void,
    sendNodeTreeToHiddenFrame: (initialSend: boolean) => void
  ) {
    this.postMessageToFrame = postMessageToFrame
    this.reloadFrame = reloadFrame
    this.sendNodeTreeToHiddenFrame = sendNodeTreeToHiddenFrame
    this.frameState = FrameState.REQUESTING_INITIAL_FILES
    this.lastHeartbeatTimestamp = new Date()
    this.lastSentNodeTree = new Date(new Date().getMilliseconds() - 1000)
  }

  sendHeartbeatRequest() {
    const payload: RuntimeMessage = { type: 'heartbeat' }
    this.postMessageToFrame(payload)
  }

  postMessage(message: RuntimeMessage) {
    this.postMessageToFrame(message)
  }

  handleHeartbeat(frameState: FrameState) {
    this.frameState = frameState
    this.lastHeartbeatTimestamp = new Date()
    if (this.frameState == FrameState.REQUESTING_INITIAL_FILES) {
      this.needsNewNodeTree = false
      this.sendNodeTreeToHiddenFrame(true)
    }
  }

  setNeedsNewNodeTree(value: boolean) {
    this.needsNewNodeTree = value
    setTimeout(() => this.sendNewNodeTreeIfNeeded(), 0)
  }

  sendNewNodeTreeIfNeeded() {
    if (this.needsNewNodeTree) {
      const now = new Date()
      const millis = now.getTime() - this.lastSentNodeTree.getTime()

      // Rate limit: Only send if it's been some time since we last sent.
      if (millis > 500) {
        this.needsNewNodeTree = false
        this.lastSentNodeTree = new Date()
        this.sendNodeTreeToHiddenFrame(false)
      }
    }
  }

  checkHeartbeatFromFrame = () => {
    if (this.frameState === FrameState.UNMOUNTED) {
      return
    }
    const now = new Date()
    const millis = now.getTime() - this.lastHeartbeatTimestamp.getTime()
    if (millis > HeartbeatTimeout) {
      this.frameState = FrameState.DEAD
    }
    switch (this.frameState) {
      case FrameState.REQUESTING_INITIAL_FILES:
        if (millis > HeartbeatSendInterval) {
          this.sendHeartbeatRequest()
        }
        break
      case FrameState.LIVE:
        if (this.needsNewNodeTree) {
          this.sendNodeTreeToHiddenFrame(false)
        }
        if (millis > HeartbeatSendInterval) {
          this.sendHeartbeatRequest()
        }
        break
      case FrameState.DEAD:
        console.warn('frame is dead, reloading')
        this.reloadFrame()
        this.frameState = FrameState.REQUESTING_INITIAL_FILES
        this.lastHeartbeatTimestamp = new Date()
        break
    }
    this.currentHeartbeat = setTimeout(() => {
      this.checkHeartbeatFromFrame()
    }, HeartbeatCheckInterval)
  }

  startHeartbeat() {
    this.checkHeartbeatFromFrame()
  }

  stopHeartbeat() {
    this.frameState = FrameState.UNMOUNTED
    clearTimeout(this.currentHeartbeat)
  }
}
