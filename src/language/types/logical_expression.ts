import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, NodeAttachmentLocation, SerializedNode } from "../type_registry";
import { HighlightColorCategory } from "../../layout/colors";
import { ChildSet, ChildSetType } from "../childset";
import { ExpressionKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";

export const LOGICAL_EXPRESSION = 'LOGICAL_EXPRESSION';


export class LogicalExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, LOGICAL_EXPRESSION);
    this.setProperty('operator', '');
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression);
  }

  setOperator(operator: string) {
    this.setProperty('operator', operator);
  }

  getOperator() : "&&" | "||" {
    return this.getProperty('operator');
  }

  getArguments() : ChildSet {
    return this.getChildSet('arguments');
  }

  generateJsAst() : ExpressionKind {
    let args = this.getArguments();
    let lhsExpression = args.getChild(0).generateJsAst() as ExpressionKind;
    args.children.slice(1).forEach((child: SplootExpression) => {
      let rhsExpression = child.generateJsAst() as ExpressionKind;
      lhsExpression = recast.types.builders.logicalExpression(this.getOperator(), lhsExpression, rhsExpression);
    })
    return lhsExpression;
  }

  static deserialize(serializedNode: SerializedNode) : LogicalExpression {
    let node = new LogicalExpression(null);
    node.setOperator(serializedNode.properties['operator']);
    node.deserializeChildSet('arguments', serializedNode);
    return node;
  }

  getNodeLayout() {
    return new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.KEYWORD, this.getOperator() === '&&' ? 'AND' : 'OR'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ]);
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = LOGICAL_EXPRESSION;
    typeRegistration.deserializer = LogicalExpression.deserialize;
    typeRegistration.properties = ['operator'];
    typeRegistration.childSets = {'init': NodeCategory.ExpressionToken};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'operator'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ]);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(LOGICAL_EXPRESSION, NodeCategory.ExpressionToken, new EmptySuggestionGenerator());  
  }
}