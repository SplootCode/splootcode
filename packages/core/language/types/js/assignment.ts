import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { ExpressionKind, IdentifierKind, MemberExpressionKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../colors";
import { JavaScriptSplootNode } from "../../javascript_node";


export const ASSIGNMENT = 'ASSIGNMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new Assignment(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'set', 'set', true);
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class Assignment extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, ASSIGNMENT);
    this.addChildSet('left', ChildSetType.Single, NodeCategory.Expression);
    this.getChildSet('left').addChild(new SplootExpression(null));
    this.addChildSet('right', ChildSetType.Single, NodeCategory.Expression);
    this.getChildSet('right').addChild(new SplootExpression(null));
  }

  getLeft() {
    return this.getChildSet('left');
  }

  getRight() {
    return this.getChildSet('right');
  }

  generateJsAst() {
    let left = (this.getLeft().children[0] as JavaScriptSplootNode).generateJsAst() as IdentifierKind | MemberExpressionKind;
    let right = (this.getRight().children[0] as JavaScriptSplootNode).generateJsAst() as ExpressionKind;
    return recast.types.builders.assignmentExpression('=', left, right);
  }

  static deserializer(serializedNode: SerializedNode) : Assignment {
    let node = new Assignment(null);
    node.getLeft().removeChild(0);
    node.deserializeChildSet('left', serializedNode);
    node.getRight().removeChild(0);
    node.deserializeChildSet('right', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = ASSIGNMENT;
    typeRegistration.deserializer = Assignment.deserializer;
    typeRegistration.properties = [];
    typeRegistration.childSets = {
      'left': NodeCategory.Expression,
      'right': NodeCategory.Expression
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'set'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'left'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'right', 'set to'),
    ]);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(ASSIGNMENT, NodeCategory.ExpressionToken, new Generator());
  }
}
