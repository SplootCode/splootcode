import { LoopAnnotation, NodeAnnotation } from '../annotations/annotations'
import { SplootNode } from '../node'

export enum NodeMutationType {
  SET_PROPERTY,
  SET_RUNTIME_ANNOTATIONS,
  SET_VALIDITY,
  UPDATE_NODE_LAYOUT,
}

export class NodeMutation {
  node: SplootNode
  type: NodeMutationType
  property: string
  value: string
  annotations: NodeAnnotation[]
  validity: { valid: boolean; reason: string; childset?: string; index?: number }
  loopAnnotation: LoopAnnotation
}
