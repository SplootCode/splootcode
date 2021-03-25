import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { FunctionDeclarationKind, ObjectPropertyKind, StatementKind } from "ast-types/gen/kinds";
import { FunctionDefinition } from "../../lib/loader";
import { HighlightColorCategory } from "../../../layout/colors";
import { SuggestedNode } from "../../suggested_node";
import { DeclaredIdentifier } from "../js/declared_identifier";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";
import { JavaScriptSplootNode } from "../../javascript_node";

export const JSS_STYLE_BLOCK = 'JSS_STYLE_BLOCK';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new JssStyleBlock(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'style', 'style', true, 'A new style block.');
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class JssStyleBlock extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JSS_STYLE_BLOCK);
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssBodyContent);
  }

  getIdentifier() {
    return this.getChildSet('identifier');
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

  generateJsAst() : StatementKind {
    /*
    const sheet = jss.createStyleSheet({
      button: {
        float: 'left'
      }
    }).attach();
    */
    let jss = recast.types.builders.identifier('jss');
    let createStyleSheet = recast.types.builders.identifier('createStyleSheet');
    let member = recast.types.builders.memberExpression(jss, createStyleSheet);

    let properties = this.getBody().children.map(node => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind;
    });

    let stylesObject = recast.types.builders.objectExpression(properties);
    let callCreateStyleSheet = recast.types.builders.callExpression(member, [stylesObject]);

    // (...).attach()
    let attachFunc = recast.types.builders.memberExpression(callCreateStyleSheet, recast.types.builders.identifier('attach'));
    let callAttach = recast.types.builders.callExpression(attachFunc, []);

    // const sheet = ...
    let identifier = recast.types.builders.identifier((this.getIdentifier().getChild(0) as DeclaredIdentifier).getName());
    let declarator = recast.types.builders.variableDeclarator(identifier, callAttach);
    return recast.types.builders.variableDeclaration('const', [declarator]);
  }

  static deserializer(serializedNode: SerializedNode) : JssStyleBlock {
    let node = new JssStyleBlock(null);
    node.deserializeChildSet('identifier', serializedNode);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = JSS_STYLE_BLOCK;
    functionType.deserializer = JssStyleBlock.deserializer;
    functionType.hasScope = true;
    functionType.properties = ['identifier'];
    functionType.childSets = {'params': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.JssBodyContent};
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'styles'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      let scriptEl = new SplootHtmlScriptElement(null);
      scriptEl.getContent().addChild(node);
      return scriptEl;
    }
  
    registerType(functionType);
    registerNodeCateogry(JSS_STYLE_BLOCK, NodeCategory.Statement, new Generator());
  }
}