import { HighlightColorCategory } from "../../layout/colors";
import { ChildSetType } from "../childset";
import { getValidAttributes } from "../html/tags";
import { ParentReference, SplootNode } from "../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../node_category_registry";
import { SuggestedNode } from "../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../type_registry";
import { HTML_ElEMENT, SplootHtmlElement } from "./html_element";

export const HTML_ATTRIBUTE = 'HTML_ATTRIBUTE';

function sanitizeIdentifier(textInput: string) : string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ');
  // From SO: https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
  return textInput.split(' ').map(function(word,index){
    // If it is the first word make sure to lowercase all the chars.
    if(index == 0){
      return word.toLowerCase();
    }
    // If it is not the first word only upper case the first char and lowercase the rest.
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join('');
}

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      return getValidAttributes(parent.node as SplootHtmlElement);
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class SplootHtmlAttribute extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, HTML_ATTRIBUTE);
    this.setProperty('name', name);
    this.addChildSet('value', ChildSetType.Single, NodeCategory.AttributeValueNode);
  }

  getName() {
    return this.getProperty('name');
  }

  getValue() {
    return this.getChildSet('value');
  }

  static deserializer(serializedNode: SerializedNode) : SplootHtmlAttribute {
    let doc = new SplootHtmlAttribute(null, serializedNode.properties.name);
    doc.deserializeChildSet('value', serializedNode);
    return doc;
  }
  
  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = HTML_ATTRIBUTE;
    typeRegistration.deserializer = SplootHtmlAttribute.deserializer;
    typeRegistration.childSets = {
      'value': NodeCategory.AttributeValueNode,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ATTRIBUTE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ]);
  
    registerType(typeRegistration);
    registerNodeCateogry(HTML_ATTRIBUTE, NodeCategory.AttributeNode, new Generator());
  }
}

