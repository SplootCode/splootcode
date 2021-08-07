import { IdentifierKind } from "ast-types/gen/kinds"
import * as recast from "recast"

import { HighlightColorCategory } from "../../../layout/colors"
import { JavaScriptSplootNode } from "../../javascript_node"
import { ParentReference, SplootNode } from "../../node"
import {
  NodeCategory,
  registerNodeCateogry,
  SuggestionGenerator,
} from "../../node_category_registry"
import { SuggestedNode } from "../../suggested_node"
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  registerType,
  SerializedNode,
  TypeRegistration,
} from "../../type_registry"
import {
  PYTHON_VARIABLE_REFERENCE,
  PythonVariableReference,
} from "./variable_reference"

export const PYTHON_DECLARED_IDENTIFIER = 'PYTHON_DECLARED_IDENTIFIER';

function sanitizeIdentifier(textInput: string) : string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ');
  // Don't mess with it if there are no spaces or punctuation.
  if (textInput.indexOf(' ') === -1) {
    return textInput;
  }
  
  return textInput.split(' ').map(function(word, index){
    if (index == 0) {
      // Don't prefix the first word.
      return word;
    }
    return '_' + word.toLowerCase();
  }).join('');
}

export class VariableDeclarationGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    let scope = parent.node.getScope();
    let suggestions = scope.getAllVariableDefinitions().map(varDef => {
      const varName = varDef.name;
      const newNode = new PythonDeclaredIdentifier(null, varName);
      return new SuggestedNode(newNode, `var ${varName}`, varName, true, varDef.documentation || '');
    })
    return suggestions;
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput);
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      varName = '_' + varName;
    }

    let newVar = new PythonDeclaredIdentifier(null, varName);
    let suggestedNode = new SuggestedNode(newVar, `identifier ${varName}`, 'new variable', true, 'new variable');
    return [suggestedNode];
  }
}

export class PythonDeclaredIdentifier extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PYTHON_DECLARED_IDENTIFIER);
    this.setProperty('identifier', name);
  }

  setName(name: string) {
    this.setProperty('identifier', name);
  }

  getName() {
    return this.getProperty('identifier');
  }

  static deserializer(serializedNode: SerializedNode) : PythonDeclaredIdentifier {
    let node = new PythonDeclaredIdentifier(null, serializedNode.properties.identifier);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = PYTHON_DECLARED_IDENTIFIER;
    typeRegistration.deserializer = PythonDeclaredIdentifier.deserializer;
    typeRegistration.properties = ['identifier'];
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ]);
    typeRegistration.pasteAdapters[PYTHON_VARIABLE_REFERENCE] = (node: SplootNode) => {
      let varDec = node as PythonDeclaredIdentifier;
      let newNode = new PythonVariableReference(null, varDec.getName());
      return newNode;
    }
  
    registerType(typeRegistration);
    registerNodeCateogry(PYTHON_DECLARED_IDENTIFIER, NodeCategory.PythonAssignableExpressionToken, new VariableDeclarationGenerator());
  }
}