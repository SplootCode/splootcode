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
}