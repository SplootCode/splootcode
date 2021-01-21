import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, SerializedNode } from "../type_registry";
import { SuggestedNode } from "../suggested_node";
import { VariableReference, VariableReferenceGenerator, VARIABLE_REFERENCE } from "./variable_reference";
import { ExpressionKind, MemberExpressionKind } from "ast-types/gen/kinds";
import { SplootExpression } from "./expression";
import { HighlightColorCategory } from "../../layout/colors";


export const MEMBER_EXPRESSION = 'MEMBER_EXPRESSION';


class Generator implements SuggestionGenerator {

  variableGenerator: VariableReferenceGenerator;

  constructor() {
    this.variableGenerator = new VariableReferenceGenerator();
  }

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    // TODO: Fill in-scope declared variables (ones who have members) here.
    if (index === 0) {
      return [];
    }
    let leftChild = parent.getChildSet().getChild(index - 1);
    if (leftChild.type === VARIABLE_REFERENCE && (leftChild as VariableReference).getName() === 'console') {
      return ['log', 'info', 'warn', 'debug', 'error'].map((name: string) => {
        let node = new MemberExpression(null);
        node.setMember(name);
        return new SuggestedNode(node, `member ${name}`, name, true, name, 'object');
      });
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class MemberExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, MEMBER_EXPRESSION);
    this.addChildSet('object', ChildSetType.Single , NodeCategory.Expression);
    this.setProperty('member', '')
  }

  getObjectExpressionToken() {
    return this.getChildSet('object');
  }

  setMember(identifier: string) {
    this.setProperty('member', identifier);
  }

  getMember() {
    return this.getProperty('member');
  }

  generateJsAst() : MemberExpressionKind {
    let member = recast.types.builders.identifier(this.getProperty('member'));
    
    // Create expression from a single token.
    // There's a more efficient way to do this but this'll do for now.
    let tempExpr = new SplootExpression(null);
    tempExpr.getTokenSet().addChild(this.getObjectExpressionToken().getChild(0).clone());
    let object = tempExpr.generateJsAst() as ExpressionKind;
    let memberExpression = recast.types.builders.memberExpression(object, member);
    return memberExpression;
  }

  static deserializer(serializedNode: SerializedNode) : MemberExpression {
    let node = new MemberExpression(null);
    node.setMember(serializedNode.properties['member']);
    node.deserializeChildSet('object', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = MEMBER_EXPRESSION;
    typeRegistration.deserializer = MemberExpression.deserializer;
    typeRegistration.childSets = {'object': NodeCategory.ExpressionToken};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
    ]);
  
    registerType(typeRegistration);
    registerNodeCateogry(MEMBER_EXPRESSION, NodeCategory.ExpressionToken, new Generator());
  }  
}
