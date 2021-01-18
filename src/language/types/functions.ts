import * as recast from "recast";

import { SplootNode, ParentReference } from "../node";
import { ChildSetType } from "../childset";
import { NodeCategory, registerNodeCateogry, EmptySuggestionGenerator } from "../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../type_registry";
import { ExpressionKind, FunctionDeclarationKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { FunctionDefinition } from "../lib/loader";
import { HighlightColorCategory } from "../../layout/colors";

export const FUNCTION_DECLARATION = 'FUNCTION_DECLARATION';

export class FunctionDeclaration extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, FUNCTION_DECLARATION);
    this.setProperty('identifier', '');
    this.addChildSet('params', ChildSetType.Many, NodeCategory.DeclaredIdentifier);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement);
  }

  setName(name: string) {
    this.setProperty('identifier', name);
  }

  getName() {
    return this.getProperty('identifier');
  }

  getParams() {
    return this.getChildSet('params');
  }

  getBody() {
    return this.getChildSet('body');
  }

  addSelfToScope() {
    let identifier = this.getName();
    this.getScope(true).addFunction({
      name: identifier,
      deprecated: false,
      documentation: 'Local function',
      type: {
        parameters: [],
        returnType: {type: 'any'}
      },
    } as FunctionDefinition);
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


  generateJsAst() : FunctionDeclarationKind {
    let statements = [];
    this.getBody().children.forEach((node: SplootNode) => {
      let ast = node.generateJsAst();
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind);
      }
      if (ast !== null) {
        statements.push(ast);
      }
    });
    let block = recast.types.builders.blockStatement(statements);
    let identifier = recast.types.builders.identifier(this.getName());
    return recast.types.builders.functionDeclaration(identifier, [], block);
  }

  static deserializer(serializedNode: SerializedNode) : FunctionDeclaration {
    let node = new FunctionDeclaration(null);
    node.setName(serializedNode.properties['identifier']);
    node.deserializeChildSet('params', serializedNode);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = FUNCTION_DECLARATION;
    functionType.deserializer = FunctionDeclaration.deserializer;
    functionType.hasScope = true;
    functionType.properties = ['identifier'];
    functionType.childSets = {'params': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.Statement};
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'function'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'params'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
  
    registerType(functionType);
    registerNodeCateogry(FUNCTION_DECLARATION, NodeCategory.Statement, new EmptySuggestionGenerator());  
  }
}