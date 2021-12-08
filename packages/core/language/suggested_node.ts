import { SplootNode } from "./node";

export class SuggestedNode {
  node: SplootNode;
  key: string;
  searchTerms: string;
  valid: boolean;
  description: string;
  wrapChildSetId: string;

  constructor(node: SplootNode, key: string, searchTerms: string, valid: boolean, description : string = '', wrapChildSetId : string = null) {
    this.node = node;
    this.key = key;
    this.searchTerms = searchTerms;
    this.description = description;
    this.valid = valid;
    this.wrapChildSetId = wrapChildSetId;
  }
}