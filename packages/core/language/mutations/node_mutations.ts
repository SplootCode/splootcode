import { LoopAnnotation, NodeAnnotation } from "../annotations/annotations";
import { SplootNode } from "../node"


export enum NodeMutationType {
  SET_PROPERTY,
  SET_RUNTIME_ANNOTATIONS,
}

export class NodeMutation {
  node: SplootNode;
  type: NodeMutationType;
  property: string;
  value: string;
  annotations: NodeAnnotation[];
  loopAnnotation: LoopAnnotation;
}