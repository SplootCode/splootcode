import { NodeBlock } from "../layout/rendered_node";
import { SplootNode } from "./node";

export class SuggestedNode {
  node: SplootNode;
  key: string;
  searchTerms: string;
  valid: boolean;
  description: string;
  nodeBlock: NodeBlock;
  wrapChildSetId: string;

  constructor(node: SplootNode, key: string, searchTerms: string, valid: boolean, description : string = '', wrapChildSetId : string = null) {
    this.node = node;
    this.key = key;
    this.searchTerms = searchTerms;
    this.description = description;
    this.valid = valid;
    this.wrapChildSetId = wrapChildSetId;
    this.nodeBlock = this.generateRenderedNode();
  }

  generateRenderedNode() {
    let nodeBlock = new NodeBlock(null, this.node, null, 0, false);
    nodeBlock.calculateDimensions(0, 0, null);
    return nodeBlock;
  }
}