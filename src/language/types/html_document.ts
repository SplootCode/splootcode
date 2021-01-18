import { SplootNode, ParentReference } from "../node";
import { ChildSet, ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { HighlightColorCategory } from "../../layout/colors";

export const HTML_DOCUMENT = 'HTML_DOCUMENT';

export class SplootHtmlDocument extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, HTML_DOCUMENT);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.DomNode);
  }

  getBody() {
    return this.getChildSet('body');
  }

  static deserializer(serializedNode: SerializedNode) : SplootHtmlDocument {
    let doc = new SplootHtmlDocument(null);
    doc.deserializeChildSet('body', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = HTML_DOCUMENT;
    typeRegistration.deserializer = SplootHtmlDocument.deserializer;
    typeRegistration.properties = [];
    typeRegistration.childSets = {'body': NodeCategory.Statement};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
  
    registerType(typeRegistration);
    registerNodeCateogry(HTML_DOCUMENT, NodeCategory.DocumentNode, new EmptySuggestionGenerator());
  } 
}

