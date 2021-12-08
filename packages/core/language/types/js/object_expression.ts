import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { ObjectExpressionKind, ObjectPropertyKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../colors";
import { SuggestedNode } from "../../suggested_node";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { JavaScriptSplootNode } from "../../javascript_node";

export const OBJECT_EXPRESSION = 'OBJECT_EXPRESSION';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [
      new SuggestedNode(new ObjectExpression(null), 'object', 'object map dictionary', true),
    ];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class ObjectExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, OBJECT_EXPRESSION);
    this.addChildSet('properties', ChildSetType.Many, NodeCategory.ObjectPropertyDeclaration);
  }

  getProperties() {
    return this.getChildSet('properties');
  }

  generateJsAst() : ObjectExpressionKind {
    let properties = this.getProperties().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ObjectPropertyKind;
    })
    let objExpression = recast.types.builders.objectExpression(properties);
    return objExpression;
  }

  static deserializer(serializedNode: SerializedNode) : ObjectExpression {
    let node = new ObjectExpression(null);
    node.deserializeChildSet('properties', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = OBJECT_EXPRESSION;
    typeRegistration.deserializer = ObjectExpression.deserializer;
    typeRegistration.childSets = {'values': NodeCategory.Expression};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.LITERAL_LIST, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'object'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'properties'),
    ]);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(OBJECT_EXPRESSION, NodeCategory.ExpressionToken, new Generator());
  }
}