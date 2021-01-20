import { HighlightColorCategory } from "../../layout/colors";
import { ChildSetType } from "../childset";
import { getValidElements } from "../html/tags";
import { ParentReference, SplootNode } from "../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../node_category_registry";
import { SuggestedNode } from "../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../type_registry";

export const HTML_ElEMENT = 'HTML_ELEMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      return getValidElements(parent.node as SplootHtmlElement, [])
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class SplootHtmlElement extends SplootNode {
  constructor(parentReference: ParentReference, tag: string) {
    super(parentReference, HTML_ElEMENT);
    this.setProperty('tag', tag);
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.AttributeNode);
    this.addChildSet('content', ChildSetType.Many, NodeCategory.DomNode);
  }

  getTag() : string {
    return this.getProperty('tag');
  }

  getAttributes() {
    return this.getChildSet('attributes');
  }

  getContent() {
    return this.getChildSet('content');
  }

  static deserializer(serializedNode: SerializedNode) : SplootHtmlElement {
    let doc = new SplootHtmlElement(null, serializedNode.properties.tag);
    doc.deserializeChildSet('attributes', serializedNode);
    doc.deserializeChildSet('content', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = HTML_ElEMENT;
    typeRegistration.deserializer = SplootHtmlElement.deserializer;
    typeRegistration.childSets = {
      'attributes': NodeCategory.AttributeNode,
      'content': NodeCategory.DomNode,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'tag'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(HTML_ElEMENT, NodeCategory.DomNode, new Generator());
  }
}