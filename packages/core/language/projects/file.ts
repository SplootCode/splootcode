import { SplootNode } from '../node'

import * as Y from 'yjs'

export interface SerializedSplootFileRef {
  name: string
  type: string
}

export class SplootFile {
  name: string
  type: string // Sploot node type
  rootNode: SplootNode
  isLoaded: boolean
  yDoc: Y.Doc

  constructor(name: string, type: string) {
    this.rootNode = null
    this.name = name
    this.type = type
    this.isLoaded = false
  }

  fileLoaded(node: SplootNode) {
    this.yDoc = new Y.Doc()
    this.rootNode = node
    const map = this.rootNode.recursivelyAttachYMap(this.yDoc)
    const rootMap = this.yDoc.getMap()
    rootMap.set('rootNode', map)
    this.isLoaded = true
  }

  serialize(): string {
    // We can't do this if we're not loaded.
    if (!this.isLoaded) {
      throw 'Error: Cannot serialize a file that is not loaded.'
    }
    const ser = this.rootNode.serialize()
    return JSON.stringify(ser) + '\n'
  }

  getSerializedRef(): SerializedSplootFileRef {
    return {
      name: this.name,
      type: this.type,
    }
  }
}
