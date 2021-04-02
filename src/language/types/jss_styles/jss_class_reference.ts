import * as recast from "recast";

import { ParentReference } from "../../node";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { ExpressionKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../layout/colors";
import { SuggestedNode } from "../../suggested_node";
import { JavaScriptSplootNode } from "../../javascript_node";
import { LOCAL_STYLES_IDENTIFIER } from "./jss_style_block";

export const JSS_CLASS_REFERENCE = 'JSS_CLASS_REFERENCE';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    // Find the local styles variable
    let scope = parent.node.getScope();
    let varDef = scope.getVariableDefintionByName(LOCAL_STYLES_IDENTIFIER);
    if (varDef) {
      let results = []
      for(let className in varDef.type.objectProperties['classes'].objectProperties) {
        results.push(new SuggestedNode(new JssClassReference(null, className), `classref ${className}`, `class ${className}`, true, 'Local style sheet class'));
      }
      return results;
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class JssClassReference extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, JSS_CLASS_REFERENCE);
    this.setProperty('name', name);
  }

  getIdentifier() {
    return this.getProperty('name');
  }

  generateJsAst() : ExpressionKind {
    let styles = recast.types.builders.identifier(LOCAL_STYLES_IDENTIFIER);
    let classes = recast.types.builders.memberExpression(styles, recast.types.builders.identifier('classes'));
    let classNameIdentifier = recast.types.builders.identifier(this.getIdentifier());
    return recast.types.builders.memberExpression(classes, classNameIdentifier);
  }

  static deserializer(serializedNode: SerializedNode) : JssClassReference {
    let node = new JssClassReference(null, serializedNode.properties.name);
    return node;
  }

  static register() {
    let functionType = new TypeRegistration();
    functionType.typeName = JSS_CLASS_REFERENCE;
    functionType.deserializer = JssClassReference.deserializer;
    functionType.hasScope = false;
    functionType.properties = ['name'];
    functionType.childSets = {};
    functionType.layout = new NodeLayout(HighlightColorCategory.STYLE_RULE, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'class'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'name')
    ]);

    registerType(functionType);
    registerNodeCateogry(JSS_CLASS_REFERENCE, NodeCategory.ExpressionToken, new Generator());
  }
}