import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { FunctionDeclarationKind, ObjectPropertyKind } from "ast-types/gen/kinds";
import { FunctionDefinition } from "../../lib/loader";
import { HighlightColorCategory } from "../../../layout/colors";
import { SuggestedNode } from "../../suggested_node";
import { DeclaredIdentifier } from "../js/declared_identifier";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";
import { JavaScriptSplootNode } from "../../javascript_node";

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

  generateJsAst() : ObjectPropertyKind {
    // A JSS class is of the form: foo: { color: 'red' }
    let key = recast.types.builders.identifier((this.getIdentifier().getChild(0) as DeclaredIdentifier).getName());
    let properties = this.getBody().children.map(node => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind;
    });
    let value = recast.types.builders.objectExpression(properties);
    return recast.types.builders.objectProperty(key, value);
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
    functionType.hasScope = true;
    functionType.properties = ['identifier'];
    functionType.childSets = {'params': NodeCategory.DeclaredIdentifier, 'body': NodeCategory.JssStyleProperties};
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