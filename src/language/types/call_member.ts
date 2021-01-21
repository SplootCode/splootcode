import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator, SuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { SuggestedNode } from "../suggested_node";
import { VariableReference, VariableReferenceGenerator, VARIABLE_REFERENCE } from "./variable_reference";
import { CallExpressionKind, ExpressionKind } from "ast-types/gen/kinds";

import { SplootExpression } from "./expression";
import { HighlightColorCategory } from "../../layout/colors";


export const CALL_MEMBER = 'CALL_MEMBER';

class Generator implements SuggestionGenerator {

  variableGenerator: VariableReferenceGenerator;

  constructor() {
    this.variableGenerator = new VariableReferenceGenerator();
  }

  staticSuggestions(parent: ParentReference, index: number) {
    // TODO: Fill in-scope declared variables (ones who have members) here.
    if (index === 0) {
      return [];
    }
    let leftChild = parent.getChildSet().getChild(index - 1);

    if (leftChild.type === VARIABLE_REFERENCE) {
      let variable = leftChild as VariableReference;
      let members = parent.node.getScope().getMethods(variable.getName());
      return members.map(methodDefinition => {
        let name = methodDefinition.name;
        let node = new CallMember(null);
        node.setMember(methodDefinition.name);
        return new SuggestedNode(node, `callmember ${name}`, name, true, methodDefinition.documentation ?? "No documentation", 'object');
      })
    }
    return [];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [];
  }
}

export class CallMember extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, CALL_MEMBER);
    this.addChildSet('object', ChildSetType.Single , NodeCategory.ExpressionToken);
    this.setProperty('member', '')
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression);
  }

  getObjectExpressionToken() {
    return this.getChildSet('object');
  }

  setMember(identifier: string) {
    this.setProperty('member', identifier);
  }

  getArguments() {
    return this.getChildSet('arguments');
  }

  generateJsAst() : CallExpressionKind {
    let member = recast.types.builders.identifier(this.getProperty('member'));
    // Create expression from a single token.
    // There's a more efficient way to do this but this'll do for now.
    let tempExpr = new SplootExpression(null);
    tempExpr.getTokenSet().addChild(this.getObjectExpressionToken().getChild(0).clone());
    let object = tempExpr.generateJsAst() as ExpressionKind;
    let memberExpression = recast.types.builders.memberExpression(object, member);
    let args = this.getArguments().children.map((argNode: SplootNode) => {
      return argNode.generateJsAst() as ExpressionKind;
    })
    let call = recast.types.builders.callExpression(memberExpression, args);
    return call;
  }

  static deserializer(serializedNode: SerializedNode) : CallMember {
    let node = new CallMember(null);
    node.setMember(serializedNode.properties['member']);
    node.deserializeChildSet('object', serializedNode);
    node.deserializeChildSet('arguments', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = CALL_MEMBER;
    typeRegistration.deserializer = CallMember.deserializer;
    typeRegistration.childSets = {'object': NodeCategory.Expression, 'arguments': NodeCategory.Expression};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'arguments'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(CALL_MEMBER, NodeCategory.ExpressionToken, new Generator());
  }
}