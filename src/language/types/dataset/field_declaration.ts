import { SplootNode, ParentReference } from "../../node";
import { registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from "../../node_category_registry";


export const DATA_FIELD_DECLARATION = 'DATA_FIELD_DECLARATION';

export class SplootDataFieldDeclaration extends SplootNode {
  constructor(parentReference: ParentReference, fieldName: string) {
    super(parentReference, DATA_FIELD_DECLARATION);
    this.setProperty('name', fieldName);
  }

  getName() : string {
      return this.getProperty('name');
  }

  static deserializer(serializedNode: SerializedNode) : SplootDataFieldDeclaration {
    let node = new SplootDataFieldDeclaration(null, serializedNode.properties['name']);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = DATA_FIELD_DECLARATION;
    typeRegistration.deserializer = SplootDataFieldDeclaration.deserializer;
    typeRegistration.childSets = {};
    typeRegistration.layout = null;
  
    registerType(typeRegistration);
    registerNodeCateogry(DATA_FIELD_DECLARATION, NodeCategory.DataSheetFieldDeclaration, new EmptySuggestionGenerator());
  }
}