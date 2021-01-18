import { SplootNode } from "../node"


export enum NodeMutationType {
  SET_PROPERTY,
}

export class NodeMutation {
  node: SplootNode;
  type: NodeMutationType;
  property: string;
  value: string;
}