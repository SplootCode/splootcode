import * as recast from "recast";

import { ExpressionKind } from "ast-types/gen/kinds";
import { HighlightColorCategory } from "../../../colors";
import { ChildSetType } from "../../childset";
import { JavaScriptSplootNode } from "../../javascript_node";
import { ParentReference, SplootNode } from "../../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../../node_category_registry";
import { SuggestedNode } from "../../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { SplootExpression, SPLOOT_EXPRESSION } from "../js/expression";
import { ComponentProperty } from "./component_property";
import { ComponentDefinition, VariableDefinition } from "../../definitions/loader";

export const COMPONENT_INVOCATION = 'COMPONENT_INVOCATION';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let scope = parent.node.getScope();
    let suggestions = scope.getAllComponentDefinitions().map((componentDef: ComponentDefinition) => {
      let varName = componentDef.name;
      let newVar = new ComponentInvocation(null, varName);
      let doc = componentDef.documentation;
      if (!doc) {
        doc = "No documentation";
      }
      return new SuggestedNode(newVar, `component ${varName}`, varName, true, doc);
    });
    return suggestions;
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class ComponentInvocation extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, COMPONENT_INVOCATION);
    this.setProperty('name', name);
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.ComponentProperty);
    this.addChildSet('content', ChildSetType.Many, NodeCategory.Expression);
  }

  getName() : string {
    return this.getProperty('name');
  }

  getAttributes() {
    return this.getChildSet('attributes');
  }

  getPropertyDefinitions() : VariableDefinition[] {
    let scope = this.getScope();
    if (!scope) {
      return [];
    }
    let compDef = scope.getComponentDefinitionByName(this.getName());
    return compDef.proptypes;
  }

  getContent() {
    return this.getChildSet('content');
  }

  clean() {
    this.getContent().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getContent().removeChild(index);
        }
      }
    });
  }

  generateJsAst() : ExpressionKind {
    let children = [];
    this.getContent().children.forEach((node: JavaScriptSplootNode) => {
      let ast = node.generateJsAst(); // Every node should (in theory) be a valid expression.
      if (ast !== null) {
        children.push(ast);
      }
    });

    let callArguments : ExpressionKind[] = [recast.types.builders.identifier(this.getName())];
    let props = recast.types.builders.objectExpression(this.getAttributes().children.map(
      (node: SplootNode) => {
        return (node as ComponentProperty).generateJsAst();
      }
    ));
    callArguments.push(props);
    callArguments = callArguments.concat(children)
    let reactIdentifier = recast.types.builders.identifier('React');
    let createElementIdentifier = recast.types.builders.identifier('createElement');
    let reactCreateElement = recast.types.builders.memberExpression(reactIdentifier, createElementIdentifier, false);
    return recast.types.builders.callExpression(reactCreateElement, callArguments);
  }

  static deserializer(serializedNode: SerializedNode) : ComponentInvocation {
    let doc = new ComponentInvocation(null, serializedNode.properties.name);
    doc.deserializeChildSet('attributes', serializedNode);
    doc.deserializeChildSet('content', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = COMPONENT_INVOCATION;
    typeRegistration.deserializer = ComponentInvocation.deserializer;
    typeRegistration.childSets = {
      'attributes': NodeCategory.ComponentProperty,
      'content': NodeCategory.DomNode,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(COMPONENT_INVOCATION, NodeCategory.ExpressionToken, new Generator());
  }
}