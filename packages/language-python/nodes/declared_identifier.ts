import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'

export const PYTHON_DECLARED_IDENTIFIER = 'PYTHON_DECLARED_IDENTIFIER'

/** @deprecated Use PythonIdentifier */
export class PythonDeclaredIdentifier extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PYTHON_DECLARED_IDENTIFIER)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  static deserializer(serializedNode: SerializedNode): PythonDeclaredIdentifier {
    const node = new PythonDeclaredIdentifier(null, serializedNode.properties.identifier)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_DECLARED_IDENTIFIER
    typeRegistration.deserializer = PythonDeclaredIdentifier.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])
    typeRegistration.pasteAdapters[PYTHON_IDENTIFIER] = (node: SplootNode) => {
      const varDec = node as PythonDeclaredIdentifier
      const newNode = new PythonIdentifier(null, varDec.getName())
      return newNode
    }

    registerType(typeRegistration)
  }
}
