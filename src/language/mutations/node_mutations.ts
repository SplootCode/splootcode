import { SplootNode } from "../node"


export enum NodeMutationType {
  SET_PROPERTY,
  SET_RUNTIME_ANNOTATION,
}

export class NodeMutation {
  node: SplootNode;
  type: NodeMutationType;
  property: string;
  value: string;
  annotationValue: string[];
}