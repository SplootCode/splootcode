import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { ExpressionKind, FunctionExpressionKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";

import * as recast from "recast";
import { HighlightColorCategory } from "../../layout/colors";

export const INLINE_FUNCTION_DECLARATION = 'INLINE_FUNCTION_DECLARATION';

export class InlineFunctionDeclaration extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, INLINE_FUNCTION_DECLARATION);
    this.addChildSet('params', ChildSetType.Many, NodeCategory.DeclaredIdentifier);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement);
  }

  getParams() {
    return this.getChildSet('params');
  }

  getBody() {
    return this.getChildSet('body');
  }

  generateJsAst() : FunctionExpressionKind {
    let statements = [];
    this.getBody().children.forEach((node: SplootNode) => {
      let ast = node.generateJsAst();
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind);
      }
      statements.push(ast);
    });
    let block = recast.types.builders.blockStatement(statements);
    return recast.types.builders.functionExpression(null, [], block);
  }

  static deserializer(serializedNode: SerializedNode) : InlineFunctionDeclaration {
    let node = new InlineFunctionDeclaration(null);
    node.deserializeChildSet('params', serializedNode);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  clean() {
    this.getBody().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getBody().removeChild(index);
        }
      }
    });
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = INLINE_FUNCTION_DECLARATION;
    typeRegistration.hasScope = true;
    typeRegistration.deserializer = InlineFunctionDeclaration.deserializer;
    typeRegistration.properties = ['identifier'];
    typeRegistration.childSets = {'params': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.Statement};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'inline function'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'params'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(INLINE_FUNCTION_DECLARATION, NodeCategory.Expression, new EmptySuggestionGenerator());
  }
}
