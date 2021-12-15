import { SplootNode, ParentReference } from '../../node'
import { registerType, SerializedNode, TypeRegistration } from '../../type_registry'
import { EmptySuggestionGenerator, NodeCategory, registerNodeCateogry } from '../../node_category_registry'

export const DATA_FIELD_DECLARATION = 'DATA_FIELD_DECLARATION'

export class SplootDataFieldDeclaration extends SplootNode {
  constructor(parentReference: ParentReference, key: string, fieldName: string) {
    super(parentReference, DATA_FIELD_DECLARATION)
    this.setProperty('key', key)
    this.setProperty('name', fieldName)
  }

  getName(): string {
    return this.getProperty('name')
  }

  getKey(): string {
    return this.getProperty('key')
  }

  static deserializer(serializedNode: SerializedNode): SplootDataFieldDeclaration {
    const node = new SplootDataFieldDeclaration(
      null,
      serializedNode.properties['key'],
      serializedNode.properties['name']
    )
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = DATA_FIELD_DECLARATION
    typeRegistration.deserializer = SplootDataFieldDeclaration.deserializer
    typeRegistration.childSets = {}
    typeRegistration.layout = null

    registerType(typeRegistration)
    registerNodeCateogry(DATA_FIELD_DECLARATION, NodeCategory.DataSheetFieldDeclaration, new EmptySuggestionGenerator())
  }
}
