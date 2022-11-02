import {
  NodeCategory,
  ParentReference,
  SerializedNode,
  SplootNode,
  TypeRegistration,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'

export const DATA_STRING_ENTRY = 'DATA_STRING_ENTRY'

export class SplootDataStringEntry extends SplootNode {
  constructor(parentReference: ParentReference, fieldName: string, value: string) {
    super(parentReference, DATA_STRING_ENTRY)
    this.setProperty('fieldname', fieldName)
    this.setProperty('value', value)
  }

  getFieldName(): string {
    return this.getProperty('fieldname')
  }

  getValue(): string {
    return this.getProperty('value')
  }

  setValue(value: string) {
    this.setProperty('value', value)
  }

  static deserializer(serializedNode: SerializedNode): SplootDataStringEntry {
    const node = new SplootDataStringEntry(
      null,
      serializedNode.properties['fieldname'],
      serializedNode.properties['value']
    )
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = DATA_STRING_ENTRY
    typeRegistration.deserializer = SplootDataStringEntry.deserializer
    typeRegistration.childSets = {}
    typeRegistration.layout = null

    registerType(typeRegistration)
    registerNodeCateogry(DATA_STRING_ENTRY, NodeCategory.DataSheetEntry)
  }
}
