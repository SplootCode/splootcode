import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { ObjectPropertyKind, StatementKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../layout/colors";
import { SuggestedNode } from "../../suggested_node";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";
import { JavaScriptSplootNode } from "../../javascript_node";
import { VariableDefinition } from "../../lib/loader";

export const JSS_STYLE_BLOCK = 'JSS_STYLE_BLOCK';
export const LOCAL_STYLES_IDENTIFIER = 'jss_local_styles';

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
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssBodyContent);
  }

  getBody() {
    return this.getChildSet('body');
  }

  addSelfToScope() {
    // Need to add LOCAL_STYLES_IDENTIFIER to scope
    // TODO: Hide this from autocomplete (?).
    let varDef : VariableDefinition = {
      name: LOCAL_STYLES_IDENTIFIER,
      deprecated: false,
      type: {
        type: 'object',
        objectProperties: {
          'classes': {
            type: 'object',
            objectProperties: {},
          },
        },
      },
      documentation: 'Local style sheet',
    };
    this.getScope().addVariable(varDef);
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
    let identifier = recast.types.builders.identifier(LOCAL_STYLES_IDENTIFIER);
    let declarator = recast.types.builders.variableDeclarator(identifier, callAttach);
    return recast.types.builders.variableDeclaration('const', [declarator]);
  }

  static deserializer(serializedNode: SerializedNode) : JssStyleBlock {
    let node = new JssStyleBlock(null);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = JSS_STYLE_BLOCK;
    functionType.deserializer = JssStyleBlock.deserializer;
    functionType.hasScope = false;
    functionType.properties = ['identifier'];
    functionType.childSets = {'params': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.JssBodyContent};
    functionType.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'private stylesheet'),
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