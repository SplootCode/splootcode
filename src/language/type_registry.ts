import { HighlightColorCategory } from "../layout/colors";
import { SplootNode } from "./node";
import { NodeCategory } from "./node_category_registry";

const typeRegistry = {};

export class TypeRegistration {
  typeName: string;
  hasScope: boolean = false;
  categories: NodeCategory[];
  properties: string[];
  childSets: {[key: string]: NodeCategory};
  layout: NodeLayout;
  deserializer: (serialisedNode: SerializedNode) => SplootNode;
}

export enum NodeAttachmentLocation {
  SIDE = 0,
  TOP
}

export class NodeLayout {
  color: HighlightColorCategory;
  components: LayoutComponent[];
  attachment: NodeAttachmentLocation;

  constructor(color: HighlightColorCategory, layoutComponents: LayoutComponent[], attachment:NodeAttachmentLocation = NodeAttachmentLocation.SIDE) {
    this.color = color;
    this.attachment = attachment,
    this.components = layoutComponents;
  }
}

export enum LayoutComponentType {
  KEYWORD = 0,
  STRING_LITERAL,
  PROPERTY,
  CHILD_SET_ATTACH_RIGHT_EXPRESSION,
  CHILD_SET_BLOCK,
  CHILD_SET_INLINE,
  CHILD_SET_TREE,
  CHILD_SET_ATTACH_LEFT,
  CHILD_SET_ATTACH_RIGHT,
  CHILD_SET_TOKEN_LIST,
  CHILD_SET_BREADCRUMBS,
}

export class LayoutComponent {
  type: LayoutComponentType;
  identifier: string;
  metadata: any;
  
  constructor(type: LayoutComponentType, identifier: string, metadata?: any) {
    this.type = type;
    this.identifier = identifier;
    this.metadata = metadata;
  }
}

export function registerType(registration : TypeRegistration) {
  typeRegistry[registration.typeName] = registration;
}

export function isScopedNodeType(typeName: string) {
  return typeRegistry[typeName].hasScope;
}

export function getLayout(typeName: string) : NodeLayout {
  let registration = typeRegistry[typeName];
  if (registration) {
    return registration.layout;
  }
  console.warn(`Missing type registration for type ${typeName}`);
  return null;
}

export interface SerializedNode {
  type: string,
  id: string,
  properties: { [key: string]: string },
  childSets: { [key: string]: SerializedNode[] }
}

export function deserializeNode(serialisedNode: SerializedNode) : SplootNode {
  let typeName = serialisedNode.type;
  let registry = typeRegistry[typeName];
  if (!registry) {
    console.warn('Could not find type registration for: ', typeName);
    return null;
  }
  if (!registry.deserializer) {
    console.warn('Missing deserializer for type: ', typeName);
    return null;
  }
  return typeRegistry[typeName].deserializer(serialisedNode);
}
