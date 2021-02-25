import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, SerializedNode } from "../type_registry";
import { SuggestedNode } from "../suggested_node";
import { ExpressionKind, MemberExpressionKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { HighlightColorCategory } from "../../layout/colors";
import { JavaScriptSplootNode } from "../javascript_node";


export const LOOKUP_EXPRESSION = 'LOOKUP_EXPRESSION';


class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    return [
      new SuggestedNode(new LookupExpression(null), 'item', 'item index get', true)
    ];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  }
}

export class LookupExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, LOOKUP_EXPRESSION);
    this.addChildSet('object', ChildSetType.Single , NodeCategory.ExpressionToken);
    this.addChildSet('property', ChildSetType.Single, NodeCategory.Expression);
    this.getChildSet('property').addChild(new SplootExpression(null));
  }

  getObjectExpressionToken() {
    return this.getChildSet('object');
  }

  getPropertyExpression() : SplootExpression {
    return this.getChildSet('property').getChild(0) as SplootExpression;
  }

  generateJsAst() : MemberExpressionKind {    
    // Create expression from a single token.
    // There's a more efficient way to do this but this'll do for now.
    let objectExpression = new SplootExpression(null);
    objectExpression.getTokenSet().addChild(this.getObjectExpressionToken().getChild(0).clone());
    let object = objectExpression.generateJsAst() as ExpressionKind;
    let propExpressionAst = this.getPropertyExpression().generateJsAst();
    let memberExpression = recast.types.builders.memberExpression(object, propExpressionAst, true);
    return memberExpression;
  }

  static deserializer(serializedNode: SerializedNode) : LookupExpression {
    let node = new LookupExpression(null);
    node.deserializeChildSet('object', serializedNode);
    node.getChildSet('property').removeChild(0);
    node.deserializeChildSet('property', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = LOOKUP_EXPRESSION;
    typeRegistration.deserializer = LookupExpression.deserializer;
    typeRegistration.childSets = {
      'object': NodeCategory.ExpressionToken,
      'property': NodeCategory.Expression,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'object'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'property', 'item'),
    ]);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(LOOKUP_EXPRESSION, NodeCategory.ExpressionToken, new Generator());
  }  
}
