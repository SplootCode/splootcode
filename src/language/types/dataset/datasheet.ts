import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from "../../node_category_registry";
import { ArrayExpressionKind } from "ast-types/gen/kinds";
import { SplootDataFieldDeclaration } from "./field_declaration";
import { SplootDataRow } from "./row";

export const DATA_SHEET = 'DATA_SHEET';

export class SplootDataSheet extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, DATA_SHEET);
    this.setProperty('name', 'datasheet');
    this.addChildSet('field_declarations', ChildSetType.Many, NodeCategory.DataSheetFieldDeclaration);
    this.addChildSet('rows', ChildSetType.Many, NodeCategory.DataSheetRow);
  }

  getFieldDeclarations(): SplootDataFieldDeclaration[] {
    return this.getChildSet('field_declarations').children as SplootDataFieldDeclaration[];
  }

  addFieldDeclaration(dec: SplootDataFieldDeclaration) {
    this.getChildSet('field_declarations').addChild(dec);
  }

  getRows(): SplootDataRow[] {
    return this.getChildSet('rows').children as SplootDataRow[];
  }

  addRow() {
    this.getChildSet('rows').addChild(new SplootDataRow(null));
  }

  generateJsAst() : ArrayExpressionKind {
    return null;
  }

  static deserializer(serializedNode: SerializedNode) : SplootDataSheet {
    let node = new SplootDataSheet(null);
    node.deserializeChildSet('field_declarations', serializedNode);
    node.deserializeChildSet('rows', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = DATA_SHEET;
    typeRegistration.deserializer = SplootDataSheet.deserializer;
    typeRegistration.childSets = {
      'field_declarations': NodeCategory.DataSheetFieldDeclaration,
      'rows': NodeCategory.DataSheetRow,
    };
    typeRegistration.layout = null;
  
    registerType(typeRegistration);
    registerNodeCateogry(DATA_SHEET, NodeCategory.DataSheet, new EmptySuggestionGenerator());
  }
}