import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { ExpressionKind, FunctionDeclarationKind, IdentifierKind } from "ast-types/gen/kinds";
import { SplootExpression, SPLOOT_EXPRESSION } from "../js/expression";
import { FunctionDefinition } from "../../lib/loader";
import { HighlightColorCategory } from "../../../layout/colors";
import { SuggestedNode } from "../../suggested_node";
import { DeclaredIdentifier } from "../js/declared_identifier";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";
import { JavaScriptSplootNode } from "../../javascript_node";

export const COMPONENT_DECLARATION = 'COMPONENT_DECLARATION';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new ComponentDeclaration(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'component', 'component', true, 'A new component.');
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class ComponentDeclaration extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, COMPONENT_DECLARATION);
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier);
    this.addChildSet('props', ChildSetType.Many, NodeCategory.ComponentProperty);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement);
  }

  getIdentifier() {
    return this.getChildSet('identifier');
  }

  getProps() {
    return this.getChildSet('props');
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
    let params = [recast.types.builders.identifier('props')];
    this.getBody().children.forEach((node: JavaScriptSplootNode) => {
      let ast = node.generateJsAst();
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind);
      }
      if (ast !== null) {
        statements.push(ast);
      }
    });
    let block = recast.types.builders.blockStatement(statements);
    let identifier = (this.getIdentifier().getChild(0) as JavaScriptSplootNode).generateJsAst() as IdentifierKind
    return recast.types.builders.functionDeclaration(identifier, params, block);
  }

  static deserializer(serializedNode: SerializedNode) : ComponentDeclaration {
    let node = new ComponentDeclaration(null);
    node.deserializeChildSet('identifier', serializedNode);
    node.deserializeChildSet('props', serializedNode);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = COMPONENT_DECLARATION;
    typeRegistration.deserializer = ComponentDeclaration.deserializer;
    typeRegistration.hasScope = true;
    typeRegistration.properties = ['identifier'];
    typeRegistration.childSets = {'props': NodeCategory.ComponentProperty, 'body': NodeCategory.Statement};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'component'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'props'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
    typeRegistration.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      let scriptEl = new SplootHtmlScriptElement(null);
      scriptEl.getContent().addChild(node);
      return scriptEl;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(COMPONENT_DECLARATION, NodeCategory.Statement, new Generator());
  }
}