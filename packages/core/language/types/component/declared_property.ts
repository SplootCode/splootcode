import { ParentReference } from "../../node";
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from "../../node_category_registry";
import { TypeRegistration, NodeLayout, LayoutComponent, LayoutComponentType, registerType, SerializedNode } from "../../type_registry";
import { SuggestedNode } from "../../suggested_node";
import { HighlightColorCategory } from "../../../colors";
import { JavaScriptSplootNode } from "../../javascript_node";
import { VariableDefinition } from "../../lib/loader";

export const DELCARED_PROEPRTY = 'DELCARED_PROEPRTY';

function sanitizeIdentifier(textInput: string) : string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ');
  // Don't mess with it if there are no spaces or punctuation.
  if (textInput.indexOf(' ') === -1) {
    return textInput;
  }
  
  return textInput.split(' ').map(function(word, index){
    if (index == 0) {
      // Don't change the capitalization of the first word.
      return word;
    }
    // If it is not the first word only upper case the first char and lowercase the rest.
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join('');
}

export class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    // TODO: Fill in-scope declared variables here.
    return [];
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput);
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      varName = '_' + varName;
    }

    let newVar = new DeclaredProperty(null, varName);
    let suggestedNode = new SuggestedNode(newVar, `identifier ${varName}`, '', true);
    return [suggestedNode];
  }
}

export class DeclaredProperty extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, DELCARED_PROEPRTY);
    this.setProperty('identifier', name);
  }

  setName(name: string) {
    this.setProperty('identifier', name);
  }

  getName() {
    return this.getProperty('identifier');
  }

  addSelfToScope() {
    this.getScope().addProperty(this.getVariableDefinition());
  }

  getVariableDefinition() : VariableDefinition {
    return {
      name: this.getName(),
      deprecated: false,
      documentation: 'Property',
      type: {type: "any"},
    };
  }

  generateJsAst() {
    console.warn('Invalid call to generate JS AST from component property declaration.')
    return null;
  }

  static deserializer(serializedNode: SerializedNode) : DeclaredProperty {
    let node = new DeclaredProperty(null, serializedNode.properties.identifier);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = DELCARED_PROEPRTY;
    typeRegistration.deserializer = DeclaredProperty.deserializer;
    typeRegistration.properties = ['identifier'];
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ]);
  
    registerType(typeRegistration);
    registerNodeCateogry(DELCARED_PROEPRTY, NodeCategory.ComponentPropertyDeclaration, new Generator());
  }
}