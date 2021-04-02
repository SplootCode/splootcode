import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { FunctionDeclarationKind, ObjectPropertyKind } from "ast-types/gen/kinds";
import { FunctionDefinition, TypeExpression } from "../../lib/loader";
import { HighlightColorCategory } from "../../../layout/colors";
import { SuggestedNode } from "../../suggested_node";
import { DeclaredIdentifier } from "../js/declared_identifier";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";
import { JavaScriptSplootNode } from "../../javascript_node";
import { LOCAL_STYLES_IDENTIFIER } from "./jss_style_block";
import { addPropertyToTypeExpression } from '../../scope/scope';

export const JSS_CLASS_BLOCK = 'JSS_CLASS_BLOCK';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new JssClassBlock(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'class', 'class', true, 'A css class block.');
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class JssClassBlock extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JSS_CLASS_BLOCK);
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssStyleProperties);
  }

  getIdentifier() {
    return this.getChildSet('identifier');
  }

  getBody() {
    return this.getChildSet('body');
  }

  addSelfToScope() {
    if (this.getIdentifier().getCount() === 0) {
      return;
    }
    let scope = this.getScope();
    // TODO: Check parent is a local style block, not a named style block (when we implement that).
    // Probably should fetch this var name from the parent.
    let stylesVar = scope.getVariableDefintionByName(LOCAL_STYLES_IDENTIFIER);
    let typeExpression = stylesVar.type;
    let classesType = stylesVar.type.objectProperties['classes'];
    let classType : TypeExpression = {type: 'any'};
    let identifier = (this.getIdentifier().getChild(0) as DeclaredIdentifier).getName();
    typeExpression.objectProperties['classes'] = addPropertyToTypeExpression(classesType, identifier, classType);
    scope.replaceVariableTypeExpression(LOCAL_STYLES_IDENTIFIER, typeExpression);
  }

  generateJsAst() : ObjectPropertyKind {
    // A JSS class is of the form: foo: { color: 'red' }
    let key = recast.types.builders.identifier((this.getIdentifier().getChild(0) as DeclaredIdentifier).getName());
    let properties = this.getBody().children.map(node => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind;
    });
    let value = recast.types.builders.objectExpression(properties);
    return recast.types.builders.objectProperty(key, value);
  }

  getNodeLayout() : NodeLayout {
    return new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'class'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
    ])
  }

  static deserializer(serializedNode: SerializedNode) : JssClassBlock {
    let node = new JssClassBlock(null);
    node.deserializeChildSet('identifier', serializedNode);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = JSS_CLASS_BLOCK;
    functionType.deserializer = JssClassBlock.deserializer;
    functionType.hasScope = false;
    functionType.properties = ['identifier'];
    functionType.childSets = {'identifier': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.JssStyleProperties};
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'class'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      let scriptEl = new SplootHtmlScriptElement(null);
      scriptEl.getContent().addChild(node);
      return scriptEl;
    }
  
    registerType(functionType);
    registerNodeCateogry(JSS_CLASS_BLOCK, NodeCategory.JssBodyContent, new Generator());
    registerNodeCateogry(JSS_CLASS_BLOCK, NodeCategory.JssStyleProperties, new Generator());
  }
}