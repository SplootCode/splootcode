import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '../../node'

export const PYTHON_VARIABLE_REFERENCE = 'PYTHON_VARIABLE_REFERENCE'

/** @deprecated Use PythonIdentifier */
export class PythonVariableReference extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PYTHON_VARIABLE_REFERENCE)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  static deserializer(serializedNode: SerializedNode): PythonVariableReference {
    return new PythonVariableReference(null, serializedNode.properties.identifier)
  }

  static register() {
    const varType = new TypeRegistration()
    varType.typeName = PYTHON_VARIABLE_REFERENCE
    varType.deserializer = PythonVariableReference.deserializer
    varType.properties = ['identifier']
    varType.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])
    varType.pasteAdapters[PYTHON_IDENTIFIER] = (node: SplootNode) => {
      const identifier = node as PythonIdentifier
      return new PythonIdentifier(null, identifier.getName())
    }

    registerType(varType)
  }
}
