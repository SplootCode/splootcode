import { ChildSet } from '../childset'
import { SplootNode } from '../node'

export enum ChildSetMutationType {
  INSERT,
  DELETE,
}

export class ChildSetMutation {
  childSet: ChildSet
  type: ChildSetMutationType
  nodes: SplootNode[]
  index: number
}
