import { SplootNode } from "../node";

export interface SerializedSplootFileRef {
  name: string;
  type: string;
}

export class SplootFile {
  name: string;
  type: string; // Sploot node type
  rootNode: SplootNode;
  isLoaded: boolean;

  constructor(file: SerializedSplootFileRef) {
    this.rootNode = null;
    this.name = file.name;
    this.type = file.type;
    this.isLoaded = false;
  }

  fileLoaded(node: SplootNode) {
    this.rootNode = node;
    this.isLoaded = true;
  }

  serialize() : string {
    // We can't do this if we're not loaded.
    if (!this.isLoaded) {
      throw "Error: Cannot serialize a file that is not loaded."
    }
    let ser = this.rootNode.serialize();
    return JSON.stringify(ser) + '\n';
  }

  getSerializedRef() : SerializedSplootFileRef {
    return {
      name: this.name,
      type: this.type,
    }
  }
}