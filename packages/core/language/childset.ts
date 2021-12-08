import { observable, action } from 'mobx';
import { ParentReference, SplootNode } from "./node";
import { NodeCategory } from './node_category_registry';
import { ChildSetMutation, ChildSetMutationType } from './mutations/child_set_mutations';
import { ChildSetObserver } from './observers';
import { globalMutationDispatcher } from './mutations/mutation_dispatcher';

export enum ChildSetType {
  Single = 0,
  Many,
}

export class ChildSet {
  @observable childParentRef: ParentReference; 
  @observable children: SplootNode[];
  type: ChildSetType;
  nodeCategory: NodeCategory;
  mutationObservers: ChildSetObserver[];
  enableMutations: boolean;

  constructor(owner: SplootNode, childSetId: string, type: ChildSetType, nodeCategory: NodeCategory) {
    this.children = [];
    this.childParentRef = new ParentReference(owner, childSetId);
    this.type = type;
    this.nodeCategory = nodeCategory;
    this.mutationObservers = [];
    this.enableMutations = false;
  }

  getParentRef() {
    return this.childParentRef;
  }

  getChildren() {
    return this.children;
  }

  getNodeCategory() {
    return this.nodeCategory;
  }

  fireMutation(mutation: ChildSetMutation) {
    this.mutationObservers.forEach((observer: ChildSetObserver) => {
      observer.handleChildSetMutation(mutation);
    })
    globalMutationDispatcher.handleChildSetMutation(mutation);
  }

  registerObserver(observer: ChildSetObserver) {
    this.mutationObservers.push(observer);
  }

  @action
  insertNode(node: SplootNode, index: number) {
    this.children.splice(index, 0, node);
    node.parent = this.childParentRef;
    if (this.enableMutations) {
      let mutation = new ChildSetMutation();
      mutation.type = ChildSetMutationType.INSERT;
      mutation.childSet = this;
      mutation.nodes = [node];
      mutation.index = index;
      this.fireMutation(mutation);
    }
  }

  @action
  removeChild(index: number) : SplootNode {
    let child = this.children.splice(index, 1)[0];
    child.parent = null;
    child.recursivelySetMutations(false);
    if (this.enableMutations) {
      let mutation = new ChildSetMutation();
      mutation.type = ChildSetMutationType.DELETE;
      mutation.childSet = this;
      mutation.nodes = [];
      mutation.index = index;
      this.fireMutation(mutation);
    }
    return child;
  }

  @action
  addChild(child: SplootNode) {
    this.insertNode(child, this.children.length);
    child.parent = this.childParentRef;
  }

  getChild(index: number) {
    return this.children[index];
  }

  getCount() : number {
    return this.children.length;
  }

  getIndexOf(node: SplootNode) : number {
    return this.children.indexOf(node);
  }

  getLeftChildOf(node: SplootNode) : SplootNode {
    let idx = this.children.indexOf(node);
    return this.children[idx - 1];
  }

  getRightChildOf(node: SplootNode) : SplootNode {
    let idx = this.children.indexOf(node);
    if ((idx + 1) >= this.children.length) {
      return null;
    }
    return this.children[idx + 1];
  }
    
  isChild(node: SplootNode) : boolean {
    return this.children.indexOf(node) != -1;
  }

  isChildBetween(node: SplootNode, start: SplootNode, end: SplootNode) : boolean {
    let idx = this.children.indexOf(node);
    if (idx === -1) {
      return false;
    }

    let startIdx = this.children.indexOf(start);
    let endIdx = this.children.indexOf(end);
    return (idx > startIdx && idx < endIdx);
  }

  getRightmostChild() : SplootNode {
    return this.children[this.children.length - 1];
  }

  getLeftmostChild() : SplootNode {
    return this.children[0];
  }
}