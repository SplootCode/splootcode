import { SplootNode } from "../node"
import { ChildSet } from "../childset";


export enum ChildSetMutationType {
  INSERT,
  DELETE,
}

export class ChildSetMutation {
  childSet: ChildSet;
  type: ChildSetMutationType;
  nodes: SplootNode[];
  index: number;
}