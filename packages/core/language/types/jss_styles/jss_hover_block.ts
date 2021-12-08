import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { ObjectPropertyKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../colors";
import { SuggestedNode } from "../../suggested_node";
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from "../html/html_script_element";
import { JavaScriptSplootNode } from "../../javascript_node";

export const JSS_HOVER_BLOCK = 'JSS_HOVER_BLOCK';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let sampleNode = new JssHoverBlock(null);
    let suggestedNode = new SuggestedNode(sampleNode, 'hover', 'hover', true, 'Additional styles when hovering.');
    return [suggestedNode];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class JssHoverBlock extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JSS_HOVER_BLOCK);
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssStyleProperties);
  }

  getBody() {
    return this.getChildSet('body');
  }

  generateJsAst() : ObjectPropertyKind {
    let key = recast.types.builders.stringLiteral('&:hover');
    let properties = this.getBody().children.map(node => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind;
    });
    let value = recast.types.builders.objectExpression(properties);
    return recast.types.builders.objectProperty(key, value);
  }

  static deserializer(serializedNode: SerializedNode) : JssHoverBlock {
    let node = new JssHoverBlock(null);
    node.deserializeChildSet('body', serializedNode);
    return node;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = JSS_HOVER_BLOCK;
    functionType.deserializer = JssHoverBlock.deserializer;
    functionType.hasScope = false;
    functionType.properties = [];
    functionType.childSets = {'body': NodeCategory.JssStyleProperties};
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'hover'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ]);
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      let scriptEl = new SplootHtmlScriptElement(null);
      scriptEl.getContent().addChild(node);
      return scriptEl;
    }
  
    registerType(functionType);
    registerNodeCateogry(JSS_HOVER_BLOCK, NodeCategory.JssBodyContent, new Generator());
    registerNodeCateogry(JSS_HOVER_BLOCK, NodeCategory.JssStyleProperties, new Generator());
  }
}