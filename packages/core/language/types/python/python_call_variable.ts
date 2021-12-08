import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponentType, LayoutComponent, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { sanitizeIdentifier } from "./../js/variable_reference";
import { CallExpressionKind, ExpressionKind } from "ast-types/gen/kinds";
import { PythonExpression, PYTHON_EXPRESSION } from "./python_expression";
import { HighlightColorCategory } from "../../../colors";
import { JavaScriptSplootNode } from "../../javascript_node";
import { FunctionDefinition } from "../../lib/loader";

export const PYTHON_CALL_VARIABLE = 'PYTHON_CALL_VARIABLE';

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    let scope = parent.node.getScope();
    let suggestions = scope.getAllFunctionDefinitions().map((funcDef: FunctionDefinition) => {
      let funcName = funcDef.name;
      let argCount = funcDef.type?.parameters?.length || 1;
      let newCall = new PythonCallVariable(null, funcName, argCount);
      let doc = funcDef.documentation;
      if (!doc) {
        doc = "";
      }
      return new SuggestedNode(newCall, `call ${funcName}`, funcName, true, doc);
    });
    return suggestions;
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput);
    let newVar = new PythonCallVariable(null, varName, 1);
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return [];
    }

    let suggestedNode = new SuggestedNode(newVar, `call var ${varName}`, '', false, 'undeclared function');
    return [suggestedNode];
  }
}

export class PythonCallVariable extends SplootNode {
  constructor(parentReference: ParentReference, name: string, argCount: number = 0) {
    super(parentReference, PYTHON_CALL_VARIABLE);
    this.setProperty('identifier', name);
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression);
    for(let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new PythonExpression(null));
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
    const numArgs = this.getArguments().children.length;
    this.getArguments().children.forEach((child: SplootNode, index: number) => {
      // Don't remove the first argument - leave the brackets there.
      if (!(index == 0 && numArgs == 1) && child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
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

  static deserializer(serializedNode: SerializedNode) : PythonCallVariable {
    let node = new PythonCallVariable(null, serializedNode.properties['identifier']);
    node.deserializeChildSet('arguments', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_CALL_VARIABLE;
    typeRegistration.deserializer = PythonCallVariable.deserializer;
    typeRegistration.childSets = {'arguments': NodeCategory.PythonExpression};
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ]);
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      let exp = new PythonExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(PYTHON_CALL_VARIABLE, NodeCategory.PythonExpressionToken, new Generator());
  }
}