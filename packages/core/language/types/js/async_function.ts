import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { JavaScriptSplootNode } from "../../javascript_node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { ExpressionKind, FunctionDeclarationKind, IdentifierKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { FunctionDefinition } from "../../lib/loader";
import { HighlightColorCategory } from "../../../colors";
import { DeclaredIdentifier } from "./declared_identifier";
import { SuggestedNode } from "../../suggested_node";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";

export const ASYNC_FUNCTION_DECLARATION = 'ASYNC_FUNCTION_DECLARATION';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new AsyncFunctionDeclaration(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'async function', 'async function', true, 'A new asynchronous function block.');
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class AsyncFunctionDeclaration extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, ASYNC_FUNCTION_DECLARATION);
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier);
    this.addChildSet('params', ChildSetType.Many, NodeCategory.DeclaredIdentifier);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement);
  }

  getIdentifier() {
    return this.getChildSet('identifier');
  }

  getParams() {
    return this.getChildSet('params');
  }

  getBody() {
    return this.getChildSet('body');
  }

  addSelfToScope() {
    if (this.getIdentifier().getCount() === 0) {
      // No identifier, we can't be added to the scope.
      return;
    }
    let identifier = (this.getIdentifier().getChild(0) as DeclaredIdentifier).getName();

    this.getScope(true).addFunction({
      name: identifier,
      deprecated: false,
      documentation: 'Local async function',
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

  static deserializer(serializedNode: SerializedNode) : AsyncFunctionDeclaration {
    let node = new AsyncFunctionDeclaration(null);
    node.deserializeChildSet('identifier', serializedNode);
    node.deserializeChildSet('params', serializedNode);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  generateJsAst() : FunctionDeclarationKind {
    let statements = [];
    this.getBody().children.forEach((node: SplootNode) => {
      let ast = (node as JavaScriptSplootNode).generateJsAst();
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind);
      }
      if (ast !== null) {
        statements.push(ast);
      }
    });
    let block = recast.types.builders.blockStatement(statements);
    let identifier = (this.getIdentifier().getChild(0) as JavaScriptSplootNode).generateJsAst() as IdentifierKind;
    let result = recast.types.builders.functionDeclaration(identifier, [], block);
    result.async = true;
    return result;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = ASYNC_FUNCTION_DECLARATION;
    functionType.deserializer = AsyncFunctionDeclaration.deserializer;
    functionType.hasScope = true;
    functionType.properties = ['identifier'];
    functionType.childSets = {'params': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.Statement};
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'async function'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'params'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      let scriptEl = new SplootHtmlScriptElement(null);
      scriptEl.getContent().addChild(node);
      return scriptEl;
    }
  
    registerType(functionType);
    registerNodeCateogry(ASYNC_FUNCTION_DECLARATION, NodeCategory.Statement, new Generator());
  }
}