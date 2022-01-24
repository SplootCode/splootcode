import { ChildSet } from './childset'
import { SplootNode } from './node'

export class SuggestedNode {
  node: SplootNode
  key: string
  searchTerms: string
  valid: boolean
  description: string
  wrapChildSetId: string
  insertPreviousChildSetId: string
  overrideLocationChildSet: ChildSet
  overrideLocationIndex: number

  constructor(
    node: SplootNode,
    key: string,
    searchTerms: string,
    valid: boolean,
    description = '',
    wrapChildSetId: string = null
  ) {
    this.node = node
    this.key = key
    this.searchTerms = searchTerms
    this.description = description
    this.valid = valid
    this.wrapChildSetId = wrapChildSetId
  }

  hasOverrideLocation(): boolean {
    return !!this.overrideLocationChildSet
  }

  setOverrideLocation(childSet: ChildSet, index: number) {
    this.overrideLocationChildSet = childSet
    this.overrideLocationIndex = index
  }
}
