import { ChildSet } from '../childset'
import { SplootNode } from '../node'

export class SuggestedNode {
  node: SplootNode
  key: string
  exactMatch: string
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
    this.key = `${node.type}_${key}`
    this.exactMatch = key
    this.searchTerms = searchTerms
    this.description = description
    this.valid = valid
    this.wrapChildSetId = wrapChildSetId
  }

  isExactMatch(text: string) {
    // Allow exact matches to be case insensitive
    return text.toLowerCase() === this.exactMatch.toLowerCase()
  }

  isPrefixMatch(text: string) {
    // But prefixes only come into play when there's conflicting suggestions
    // e.g. "is" and "is not", "else" and "else if" so we'll be a little stricter
    // so we don't unnecessarily reject a match.
    return this.exactMatch.startsWith(text)
  }

  hasOverrideLocation(): boolean {
    return !!this.overrideLocationChildSet
  }

  setOverrideLocation(childSet: ChildSet, index: number, wrapChildSetId: string = null) {
    this.overrideLocationChildSet = childSet
    this.overrideLocationIndex = index
    this.wrapChildSetId = wrapChildSetId
  }
}
