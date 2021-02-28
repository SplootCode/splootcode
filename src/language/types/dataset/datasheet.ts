import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from "../../node_category_registry";
import { ArrayExpressionKind } from "ast-types/gen/kinds";

export const DATA_SHEET = 'DATA_SHEET';

export class SplootDataSheet extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, DATA_SHEET);
    this.setProperty('name', 'datasheet');
    this.addChildSet('field_declaration', ChildSetType.Many, NodeCategory.DataSheetFieldDeclaration);
    this.addChildSet('rows', ChildSetType.Many, NodeCategory.DataSheetRow);
  }

  generateJsAst() : ArrayExpressionKind {
    return null;
  }

  static deserializer(serializedNode: SerializedNode) : SplootDataSheet {
    let node = new SplootDataSheet(null);
    node.deserializeChildSet('field_declaration', serializedNode);
    node.deserializeChildSet('rows', serializedNode);
    return node;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = DATA_SHEET;
    typeRegistration.deserializer = SplootDataSheet.deserializer;
    typeRegistration.childSets = {
      'field_declaration': NodeCategory.DataSheetFieldDeclaration,
      'rows': NodeCategory.DataSheetRow,
    };
    typeRegistration.layout = null;
  
    registerType(typeRegistration);
    registerNodeCateogry(DATA_SHEET, NodeCategory.DataSheet, new EmptySuggestionGenerator());
  }
}