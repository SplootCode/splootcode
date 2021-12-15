import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { IdentifierKind } from "ast-types/gen/kinds";
import { VariableDefinition } from "../../definitions/loader";
import { HighlightColorCategory } from "../../../colors";
import { SplootExpression, SPLOOT_EXPRESSION } from "./expression";
import { JavaScriptSplootNode } from "../../javascript_node";


export const VARIABLE_REFERENCE = 'VARIABLE_REFERENCE';

export function sanitizeIdentifier(textInput: string) : string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ');
  // Only sanitise the variable name if it contains space or punctuation.
  if (textInput.indexOf(' ') !== -1) {
    // From SO: https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
    return textInput.split(' ').map(function(word,index){
      // If it is the first word make sure to lowercase all the chars.
      if(index == 0){
        return word.toLowerCase();
      }
      // If it is not the first word only upper case the first char and lowercase the rest.
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
  }
  return textInput;
}

export class VariableReferenceGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    let scope = parent.node.getScope();
    let suggestions = scope.getAllVariableDefinitions().map((variableDef: VariableDefinition) => {
      let varName = variableDef.name;
      let newVar = new VariableReference(null, varName);
      let doc = variableDef.documentation;
      if (!doc) {
        doc = "No documentation";
      }
      return new SuggestedNode(newVar, `var ${varName}`, varName, true, doc);
    });
    return suggestions;
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput);
    let newVar = new VariableReference(null, varName);
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return [];
    }

    let suggestedNode = new SuggestedNode(newVar, `var ${varName}`, '', false, 'undeclared variable');
    return [suggestedNode];
  }
}

export class VariableReference extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, VARIABLE_REFERENCE);
    this.setProperty('identifier', name);
  }

  setName(name: string) {
    this.setProperty('identifier', name);
  }

  getName() {
    return this.getProperty('identifier');
  }

  generateJsAst() : IdentifierKind {
    return recast.types.builders.identifier(this.getName());
  }

  static deserializer(serializedNode: SerializedNode) : VariableReference {
    return new VariableReference(null, serializedNode.properties.identifier);
  }

  static register() {
    let varType = new TypeRegistration();
    varType.typeName = VARIABLE_REFERENCE;
    varType.deserializer = VariableReference.deserializer;
    varType.properties = ['identifier'];
    varType.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ]);
    varType.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      let exp = new SplootExpression(null);
      exp.getTokenSet().addChild(node);
      return exp;
    }
  
    registerType(varType);
    registerNodeCateogry(VARIABLE_REFERENCE, NodeCategory.ExpressionToken, new VariableReferenceGenerator());
  }
}
