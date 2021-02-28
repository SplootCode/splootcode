import { SplootNode, ParentReference } from "../../node";
import { registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from "../../node_category_registry";


export const DATA_STRING_ENTRY = 'DATA_STRING_ENTRY';

export class SplootDataStringEntry extends SplootNode {
  constructor(parentReference: ParentReference, fieldName: string, value: string) {
    super(parentReference, DATA_STRING_ENTRY);
    this.setProperty('fieldname', fieldName);
    this.setProperty('value', value);
  }

  getFieldName() : string {
    return this.getProperty('fieldname');
  }

  getValue() : string {
    return this.getProperty('value');
  }

  static deserializer(serializedNode: SerializedNode) : SplootDataStringEntry {
    let node = new SplootDataStringEntry(null, serializedNode.properties['fieldname'], serializedNode.properties['value']);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = DATA_STRING_ENTRY;
    typeRegistration.deserializer = SplootDataStringEntry.deserializer;
    typeRegistration.childSets = {};
    typeRegistration.layout = null;

    registerType(typeRegistration);
    registerNodeCateogry(DATA_STRING_ENTRY, NodeCategory.DataSheetEntry, new EmptySuggestionGenerator());
  }
}