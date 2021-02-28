import { SplootNode, ParentReference } from "../../node";
import { registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from "../../node_category_registry";
import { ChildSetType } from "../../childset";
import { SplootDataStringEntry } from "./string_entry";


export interface DataEntrySplootNode extends SplootNode {
  getFieldName: () => string;
  getValue: () => string;
  setValue: (value: string) => void;
}

export const DATA_ROW = 'DATA_ROW';

export class SplootDataRow extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, DATA_ROW);
    this.addChildSet('values', ChildSetType.Many, NodeCategory.DataSheetEntry);
  }

  getValues() {
    return this.getChildSet('values');
  }

  setValue(fieldName: string, value: string) {
    for (let valueEntry of this.getValues().children as DataEntrySplootNode[]) {
      if (valueEntry.getFieldName() === fieldName) {
        valueEntry.setValue(value);
        return;
      }
    }
    this.getValues().addChild(new SplootDataStringEntry(null, fieldName, value));
  }

  getValuesAsList(order: string[]) {
    // Returns a list of the form [{value: x}, ...]
    let temp = {};
    this.getValues().children.forEach((entry: DataEntrySplootNode) => {
      temp[entry.getFieldName()] = entry.getValue();
    });
    return order.map(key => {
      if (key in temp) {
        return {value: temp[key]};
      }
      return {value: ''};
    })
  }

  static deserializer(serializedNode: SerializedNode) : SplootDataRow {
    let node = new SplootDataRow(null);
    node.deserializeChildSet('values', serializedNode)
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = DATA_ROW;
    typeRegistration.deserializer = SplootDataRow.deserializer;
    typeRegistration.childSets = {
      'values': NodeCategory.DataSheetEntry,
    };
    typeRegistration.layout = null;

    registerType(typeRegistration);
    registerNodeCateogry(DATA_ROW, NodeCategory.DataSheetFieldDeclaration, new EmptySuggestionGenerator());
  }
}