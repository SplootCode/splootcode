import * as recast from 'recast'

import { ChildSetType } from '@splootcode/core/language/childset'
import { ExpressionKind, ObjectExpressionKind } from 'ast-types/gen/kinds'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core/language/node_category_registry'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { SerializedNode, TypeRegistration, registerType } from '@splootcode/core/language/type_registry'
import { SplootDataStringEntry } from './string_entry'

export interface DataEntrySplootNode extends SplootNode {
  getFieldName: () => string
  getValue: () => string
  setValue: (value: string) => void
}

export const DATA_ROW = 'DATA_ROW'

export class SplootDataRow extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, DATA_ROW)
    this.addChildSet('values', ChildSetType.Many, NodeCategory.DataSheetEntry)
  }

  getValues() {
    return this.getChildSet('values')
  }

  setValue(fieldName: string, value: string) {
    for (const valueEntry of this.getValues().children as DataEntrySplootNode[]) {
      if (valueEntry.getFieldName() === fieldName) {
        valueEntry.setValue(value)
        return
      }
    }
    this.getValues().addChild(new SplootDataStringEntry(null, fieldName, value))
  }

  getValuesAsList(order: string[]) {
    // Returns a list of the form [{value: x}, ...]
    const temp = {}
    this.getValues().children.forEach((entry: DataEntrySplootNode) => {
      temp[entry.getFieldName()] = entry.getValue()
    })
    return order.map((key) => {
      if (key in temp) {
        return { value: temp[key] }
      }
      return { value: '' }
    })
  }

  getValuesAsObject(order: string[], labels: string[]): ObjectExpressionKind {
    const temp = {}
    this.getValues().children.forEach((entry: DataEntrySplootNode) => {
      temp[entry.getFieldName()] = entry.getValue()
    })
    const properties = order.map((key, i) => {
      const labelExp = recast.types.builders.identifier(labels[i])
      let valueExp: ExpressionKind
      if (key in temp) {
        valueExp = recast.types.builders.stringLiteral(temp[key])
      } else {
        valueExp = recast.types.builders.stringLiteral('')
      }
      return recast.types.builders.objectProperty(labelExp, valueExp)
    })
    return recast.types.builders.objectExpression(properties)
  }

  static deserializer(serializedNode: SerializedNode): SplootDataRow {
    const node = new SplootDataRow(null)
    node.deserializeChildSet('values', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = DATA_ROW
    typeRegistration.deserializer = SplootDataRow.deserializer
    typeRegistration.childSets = {
      values: NodeCategory.DataSheetEntry,
    }
    typeRegistration.layout = null

    registerType(typeRegistration)
    registerNodeCateogry(DATA_ROW, NodeCategory.DataSheetFieldDeclaration)
  }
}
