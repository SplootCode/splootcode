import uuid from "uuid";
import { ChildSet, ChildSetType } from "./childset";
import { NodeCategory } from "./node_category_registry";
import { NodeMutationType, NodeMutation } from "./mutations/node_mutations";
import { NodeObserver } from "./observers";
import { deserializeNode, getLayout, isScopedNodeType, NodeLayout, SerializedNode } from "./type_registry";
import { globalMutationDispatcher } from "./mutations/mutation_dispatcher";
import { ASTNode } from "ast-types";
import { getGlobalScope, Scope } from "./scope/scope";

export class ParentReference {
  node: SplootNode;
  childSetId: string; // never directly use string ?

  constructor(node: SplootNode, childSetId: string) {
    this.node = node;
    this.childSetId = childSetId;
  }

  getChildSet() : ChildSet {
    return this.node.getChildSet(this.childSetId);
  }
}

export class SplootNode {
  parent: ParentReference;
  type: string;
  properties: { [key: string] : any}; // Depends on the type
  childSets: { [key: string]: ChildSet };
  childSetOrder: string[];
  mutationObservers: NodeObserver[];
  scope: Scope;

  constructor(parent: ParentReference, type: string) {
    this.parent = parent;
    this.type = type;
    this.childSets = {};
    this.childSetOrder = [];
    this.properties = {};
    this.mutationObservers = [];
    this.scope = null;
  }

  get hasChildSets(): boolean {
    return this.childSetOrder.length !== 0;
  }

  addChildSet(name: string, type: ChildSetType, category: NodeCategory) {
    this.childSets[name] = new ChildSet(this, name, type, category);
    this.childSetOrder.push(name);
  }

  getScope(skipSelf: boolean = false) : Scope {
    if (!skipSelf && isScopedNodeType(this.type)) {
      return this.scope;
    }
    if (this.parent === null) {
      return getGlobalScope();
    }
    return this.parent.node.getScope();
  }

  addSelfToScope() {
    // No-op default implementation.
    // Variable declarations and named function declarations will do this.
  }

  recursivelyBuildScope() {
    if (isScopedNodeType(this.type)) {
      if (this.parent !== null) {
        this.scope = new Scope(this.parent.node.getScope());
      } else {
        this.scope = new Scope(getGlobalScope());
      }
    }
    this.addSelfToScope();
    this.childSetOrder.forEach((childSetId: string) => {
      let childSet = this.getChildSet(childSetId);
      childSet.getChildren().forEach((node: SplootNode) => {
        node.recursivelyBuildScope();
      });
    })
  }

  getChildSet(name: string) {
    return this.childSets[name];
  }

  getProperty(name: string) {
    return this.properties[name];
  }

  setProperty(name: string, value: any) {
    this.properties[name] = value;
    let mutation = new NodeMutation();
    mutation.node = this
    mutation.property = name;
    mutation.value = value;
    mutation.type = NodeMutationType.SET_PROPERTY;
    this.fireMutation(mutation)
  }

  clean() {
    // Called when a child or sub-child is deleted.
    // Default action is no-op
  }

  validate() {
    // Called by a background task to detect things like:
    // Type mismatch, unparseable expression, undefined variable.
  }

  fireMutation(mutation: NodeMutation) {
    this.mutationObservers.forEach((observer: NodeObserver) => {
      observer.handleNodeMutation(mutation);
    })
    globalMutationDispatcher.handleNodeMutation(mutation);
  }

  registerObserver(observer: NodeObserver) {
    this.mutationObservers.push(observer);
  }

  generateJsAst() : ASTNode {
    console.warn('Missing generateJsAst implementation for: ', this.type);
    return null;
  }

  getNodeLayout() : NodeLayout {
    return getLayout(this.type);
  }

  serialize(): SerializedNode {
    let result = {
      type: this.type,
      properties: {},
      childSets: {}
    } as SerializedNode;
    for (let property in this.properties) {
      result.properties[property] = this.properties[property];
    }

    this.childSetOrder.forEach((childSetId: string) => {
      let childSet = this.getChildSet(childSetId);
      result.childSets[childSetId] = [];
      childSet.getChildren().forEach((node: SplootNode) => {
        result.childSets[childSetId].push(node.serialize());
      });
    })
    return result;
  }

  deserializeChildSet(childSetId: string, serializedNode: SerializedNode) {
    let childSet = this.getChildSet(childSetId);
    serializedNode.childSets[childSetId].forEach((serializedChildNode: SerializedNode) => {
      let childNode = deserializeNode(serializedChildNode);
      if (childNode !== null) {
        childSet.addChild(childNode);
      }
    });
  }

  clone() : SplootNode {
    // lol
    return deserializeNode(this.serialize());
  }
}