import * as recast from "recast";

import { SplootNode, ParentReference } from "../../node";
import { ChildSetType } from "../../childset";
import { registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from "../../node_category_registry";
import { SplootDataFieldDeclaration } from "./field_declaration";
import { SplootDataRow } from "./row";
import { ASTNode } from "ast-types";

export const DATA_SHEET = 'DATA_SHEET';

export class SplootDataSheet extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, DATA_SHEET);
    this.setProperty('name', 'data');
    this.addChildSet('field_declarations', ChildSetType.Many, NodeCategory.DataSheetFieldDeclaration);
    this.addChildSet('rows', ChildSetType.Many, NodeCategory.DataSheetRow);
  }

  getName() : string {
    return this.getProperty('name');
  }

  setName(name: string) {
    this.setProperty('name', name);
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

  generateJsAst() : ASTNode {
    let identifier = recast.types.builders.identifier(this.getName());
    let fields = this.getFieldDeclarations();
    let fieldIds = fields.map(fieldDec => fieldDec.getKey());
    let labels = fields.map(fieldDec => fieldDec.getName());
    let rows = this.getRows().map((row : SplootDataRow) => {
      return row.getValuesAsObject(fieldIds, labels);
    });
    let declarator = recast.types.builders.variableDeclarator(identifier, recast.types.builders.arrayExpression(rows));
    let vardec = recast.types.builders.variableDeclaration('const', [declarator]);
    let statement = recast.types.builders.exportDeclaration(false, vardec);
    return recast.types.builders.program([statement]);
  }

  generateCodeString() : string {
    return recast.print(this.generateJsAst()).code;
  }

  static deserializer(serializedNode: SerializedNode) : SplootDataSheet {
    let node = new SplootDataSheet(null);
    node.setName(serializedNode.properties['name']);
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