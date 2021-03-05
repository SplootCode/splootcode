import * as csstree from "css-tree";

import { HighlightColorCategory } from "../../../layout/colors";
import { ChildSetType } from "../../childset";
import { ParentReference, SplootNode } from "../../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../../node_category_registry";
import { SuggestedNode } from "../../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { StringLiteral, STRING_LITERAL } from "../literals";

export const STYLE_PROPERTY = 'STYLE_PROPERTY';

const properties = {
  'font': {},
  'width': {},
  'height': {},
  'background-color': {},
}

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let res = [];
    for (let prop in properties) {
      res.push(new SuggestedNode(new StyleProperty(null, prop), 'style-prop ' + prop, prop, true));
    }
    return res;
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class StyleProperty extends SplootNode {
  constructor(parentReference: ParentReference, property: string) {
    super(parentReference, STYLE_PROPERTY);
    this.setProperty('property', property);
    this.addChildSet('value', ChildSetType.Single, NodeCategory.StyleSheetPropertyValue);
  }

  getPropertyName(): string {
    return this.getProperty('property');
  }

  getValue() {
    return this.getChildSet('value');
  }

  getCssAst() : csstree.Declaration {
    let valueChildren = new csstree.List();
    let valueNode = this.getValue().getChild(0);
    if (valueNode.type === STRING_LITERAL) {
      valueChildren.push(
        {
          type: 'Raw',
          value: (valueNode as StringLiteral).getValue(),
        } as csstree.Raw
      )
    }
    let property = {
      type: 'Declaration',
      important: false,
      property: this.getPropertyName(),
      value: {
        type: 'Value',
        children: valueChildren
      }
    } as csstree.Declaration;
    return property;
  }

  generateCodeString() {
    if (this.getValue().getCount() === 0) {
      return '';
    }
    let child = this.getValue().getChild(0);
    if (child.type === STRING_LITERAL) {
      return (child as StringLiteral).getValue();
    }
  }

  static deserializer(serializedNode: SerializedNode) : StyleProperty {
    let doc = new StyleProperty(null, serializedNode.properties['property']);
    doc.deserializeChildSet('value', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = STYLE_PROPERTY;
    typeRegistration.deserializer = StyleProperty.deserializer;
    typeRegistration.childSets = {
      'value': NodeCategory.StyleSheetPropertyValue,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.STYLE_PROPERTY, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'property'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ], false);
  
    registerType(typeRegistration);
    registerNodeCateogry(STYLE_PROPERTY, NodeCategory.StyleSheetProperty, new Generator());
  }
}
