import * as recast from "recast";

import { ExpressionKind, ObjectPropertyKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../layout/colors";
import { ChildSetType } from "../../childset";
import { getValidReactAttributes } from "../../html/tags";
import { JavaScriptSplootNode } from "../../javascript_node";
import { ParentReference } from "../../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../../node_category_registry";
import { SuggestedNode } from "../../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { ReactElementNode, REACT_ELEMENT } from "./react_element";
import { SplootExpression } from "../js/expression";
import { ComponentInvocation, COMPONENT_INVOCATION } from "./component_invocation";

export const COMPONENT_PROPERTY = 'COMPONENT_PROPERTY';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    if (parent.node.type === REACT_ELEMENT) {
      return getValidReactAttributes((parent.node as ReactElementNode).getTag());
    } else if (parent.node.type === COMPONENT_INVOCATION) {
      let propdefs = (parent.node as ComponentInvocation).getPropertyDefinitions();
      return propdefs.map(varDef => {
        return new SuggestedNode(new ComponentProperty(null, varDef.name), 'prop ' + varDef.name, varDef.name, true, varDef.documentation);
      })
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class ComponentProperty extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, COMPONENT_PROPERTY);
    this.setProperty('name', name);
    this.addChildSet('value', ChildSetType.Single, NodeCategory.Expression);
    this.getChildSet('value').addChild(new SplootExpression(null));
  }

  getName(): string {
    return this.getProperty('name');
  }

  getValue() {
    return this.getChildSet('value');
  }

  generateJsAst() : ObjectPropertyKind {
    let key = recast.types.builders.identifier(this.getName());
    let value = this.getValue().getChild(0) as SplootExpression;
    if (!value) {
      return null;
    }
    let valueExpression = value.generateJsAst() as ExpressionKind;
    return recast.types.builders.objectProperty(key, valueExpression);
  }

  static deserializer(serializedNode: SerializedNode) : ComponentProperty {
    let doc = new ComponentProperty(null, serializedNode.properties.name);
    doc.getValue().removeChild(0);
    doc.deserializeChildSet('value', serializedNode);
    return doc;
  }
  
  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = COMPONENT_PROPERTY;
    typeRegistration.deserializer = ComponentProperty.deserializer;
    typeRegistration.childSets = {
      'value': NodeCategory.Expression,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ATTRIBUTE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ], true);
  
    registerType(typeRegistration);
    registerNodeCateogry(COMPONENT_PROPERTY, NodeCategory.ComponentProperty, new Generator());
  }
}
