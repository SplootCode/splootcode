import * as recast from 'recast'

import { ASTNode } from 'ast-types'
import {
  ChildSetType,
  NodeCategory,
  ParentReference,
  SerializedNode,
  SplootNode,
  TypeRegistration,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { SplootDataFieldDeclaration } from './field_declaration'
import { SplootDataRow } from './row'

export const DATA_SHEET = 'DATA_SHEET'

export class SplootDataSheet extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, DATA_SHEET)
    this.setProperty('name', 'data')
    this.addChildSet('field_declarations', ChildSetType.Many, NodeCategory.DataSheetFieldDeclaration)
    this.addChildSet('rows', ChildSetType.Many, NodeCategory.DataSheetRow)
  }

  getName(): string {
    return this.getProperty('name')
  }

  setName(name: string) {
    this.setProperty('name', name)
  }

  getFieldDeclarations(): SplootDataFieldDeclaration[] {
    return this.getChildSet('field_declarations').children as SplootDataFieldDeclaration[]
  }

  addFieldDeclaration(dec: SplootDataFieldDeclaration) {
    this.getChildSet('field_declarations').addChild(dec)
  }

  getRows(): SplootDataRow[] {
    return this.getChildSet('rows').children as SplootDataRow[]
  }

  addRow() {
    this.getChildSet('rows').addChild(new SplootDataRow(null))
  }

  generateJsAst(): ASTNode {
    const identifier = recast.types.builders.identifier(this.getName())
    const fields = this.getFieldDeclarations()
    const fieldIds = fields.map((fieldDec) => fieldDec.getKey())
    const labels = fields.map((fieldDec) => fieldDec.getName())
    const rows = this.getRows().map((row: SplootDataRow) => {
      return row.getValuesAsObject(fieldIds, labels)
    })
    const declarator = recast.types.builders.variableDeclarator(identifier, recast.types.builders.arrayExpression(rows))
    const vardec = recast.types.builders.variableDeclaration('const', [declarator])
    const statement = recast.types.builders.exportDeclaration(false, vardec)
    return recast.types.builders.program([statement])
  }

  generateCodeString(): string {
    return recast.print(this.generateJsAst()).code
  }

  static deserializer(serializedNode: SerializedNode): SplootDataSheet {
    const node = new SplootDataSheet(null)
    node.setName(serializedNode.properties['name'])
    node.deserializeChildSet('field_declarations', serializedNode)
    node.deserializeChildSet('rows', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = DATA_SHEET
    typeRegistration.deserializer = SplootDataSheet.deserializer
    typeRegistration.childSets = {
      field_declarations: NodeCategory.DataSheetFieldDeclaration,
      rows: NodeCategory.DataSheetRow,
    }
    typeRegistration.layout = null

    registerType(typeRegistration)
    registerNodeCateogry(DATA_SHEET, NodeCategory.DataSheet)
  }
}
