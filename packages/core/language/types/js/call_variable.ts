import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { sanitizeIdentifier } from "./variable_reference";
import { CallExpressionKind, ExpressionKind } from "ast-types/gen/kinds";
import { FunctionDefinition } from "../../lib/loader";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { HighlightColorCategory } from "../../../colors";
import { JavaScriptSplootNode } from "../../javascript_node";

export const CALL_VARIABLE = 'CALL_VARIABLE';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    let scope = parent.node.getScope();
    let suggestions = scope.getAllFunctionDefinitions().map((funcDef: FunctionDefinition) => {
      let funcName = funcDef.name;
      let newCall = new CallVariable(null, funcName, funcDef.type.parameters.length);
      let doc = funcDef.documentation;
      if (!doc) {
        doc = "No documentation";
      }
      return new SuggestedNode(newCall, `var ${funcName}`, funcName, true, doc);
    });
    return suggestions;
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput);
    let newVar = new CallVariable(null, varName);
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return [];
    }

    let suggestedNode = new SuggestedNode(newVar, `call var ${varName}`, '', false, 'undeclared function');
    return [suggestedNode];
  }
}

export class CallVariable extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string, argCount: number = 0) {
    super(parentReference, CALL_VARIABLE);
    this.setProperty('identifier', name);
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression);
    for(let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new SplootExpression(null));
    }
  }

  getArguments() {
    return this.getChildSet('arguments');
  }

  getIdentifier() {
    return this.properties.identifier;
  }

  setIdentifier(identifier: String) {
    this.properties.identifiter = identifier;
  }

  generateJsAst() : CallExpressionKind {
    let identifier = recast.types.builders.identifier(this.getIdentifier());
    let args = this.getArguments().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ExpressionKind;
    })
    let call = recast.types.builders.callExpression(identifier, args);
    return call;
  }

  clean() {
    this.getArguments().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getArguments().removeChild(index);
        }
      }
    });
  }

  getArgumentNames() : string[] {
    let scope = this.getScope();
    if (!scope) {
      return [];
    }
    let funcDef = scope.getFunctionDefinitionByName(this.getIdentifier());
    if (!funcDef) {
      return [];
    }
    let res = funcDef.type.parameters.map(param => param.name);
    return res;
  }

  getNodeLayout() : NodeLayout {
    let layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments', this.getArgumentNames()),
    ])
    return layout;
  }

  static deserializer(serializedNode: SerializedNode) : CallVariable {
    let node = new CallVariable(null, serializedNode.properties['identifier']);
    node.deserializeChildSet('arguments', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = CALL_VARIABLE;
    typeRegistration.deserializer = CallVariable.deserializer;
    typeRegistration.childSets = {'arguments': NodeCategory.Expression};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ]);
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(CALL_VARIABLE, NodeCategory.ExpressionToken, new Generator());
  }
}