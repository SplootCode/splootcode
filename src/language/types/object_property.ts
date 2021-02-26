import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { ExpressionKind, ObjectPropertyKind } from "ast-types/gen/kinds";
import { SplootExpression } from "./expression";
import { HighlightColorCategory } from "../../layout/colors";
import { SuggestedNode } from "../suggested_node";
import { ObjectExpression, OBJECT_EXPRESSION } from "./object_expression";
import { JavaScriptSplootNode } from "../javascript_node";

export const OBJECT_PROPERTY = 'OBJECT_PROPERTY';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [
      new SuggestedNode(new ObjectProperty(null, ''), 'property', '', true),
    ];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [
      new SuggestedNode(new ObjectProperty(null, textInput), 'property ' + textInput, 'object pro', true),
    ];
  }
}

export class ObjectProperty extends SplootNode {
  constructor(parentReference: ParentReference, key: string) {
    super(parentReference, OBJECT_PROPERTY);
    this.setProperty('key', key);
    this.addChildSet('value', ChildSetType.Single, NodeCategory.Expression);
    this.getChildSet('value').addChild(new SplootExpression(null));
  }

  getKey() : string {
    return this.getProperty('key');
  }

  setKey(key: string) {
    this.setProperty('key', key);
  }

  getValue() {
    return this.getChildSet('value');
  }

  generateJsAst() : ObjectPropertyKind {
    let key = recast.types.builders.identifier(this.getKey());
    let value = (this.getValue().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind;
    let property = recast.types.builders.objectProperty(key, value);
    return property;
  }

  static deserializer(serializedNode: SerializedNode) : ObjectProperty {
    let node = new ObjectProperty(null, serializedNode.properties['key']);
    node.getValue().removeChild(0);
    node.deserializeChildSet('value', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = OBJECT_PROPERTY;
    typeRegistration.deserializer = ObjectProperty.deserializer;
    typeRegistration.childSets = {'values': NodeCategory.Expression};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ATTRIBUTE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'key'),
        new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ], true);
    typeRegistration.pasteAdapters[OBJECT_EXPRESSION] = (node: SplootNode) => {
      let obj = new ObjectExpression(null);
      obj.getProperties().addChild(node);
      return obj;
    };
  
    registerType(typeRegistration);
    registerNodeCateogry(OBJECT_PROPERTY, NodeCategory.ObjectPropertyDeclaration, new Generator());
  }
}