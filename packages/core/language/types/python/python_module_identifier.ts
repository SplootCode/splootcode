import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_MODULE_IDENTIFIER = 'PYTHON_MODULE_IDENTIFIER'

function sanitizeIdentifier(textInput: string): string {
  textInput = textInput.replace(/[^\w\s\d.]/g, ' ')
  // Don't mess with it if there are no spaces or punctuation.
  if (textInput.indexOf(' ') === -1) {
    return textInput
  }

  return textInput
    .split(' ')
    .map(function (word, index) {
      if (index == 0) {
        // Don't prefix the first word.
        return word
      }
      return '_' + word.toLowerCase()
    })
    .join('')
}

export class ModuleSuggestionGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    // TODO: Module name autocomplete
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const varName = sanitizeIdentifier(textInput)

    const newVar = new PythonModuleIdentifier(null, varName)
    const suggestedNode = new SuggestedNode(newVar, `module ${varName}`, 'module', true, 'module')
    return [suggestedNode]
  }
}

export class PythonModuleIdentifier extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PYTHON_MODULE_IDENTIFIER)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  addSelfToScope(): void {
    this.parent?.node.addSelfToScope()
  }

  removeSelfFromScope(): void {
    this.parent?.node.addSelfToScope()
  }

  static deserializer(serializedNode: SerializedNode): PythonModuleIdentifier {
    const node = new PythonModuleIdentifier(null, serializedNode.properties.identifier)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_MODULE_IDENTIFIER
    typeRegistration.deserializer = PythonModuleIdentifier.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_MODULE_IDENTIFIER, NodeCategory.PythonModuleIdentifier, new ModuleSuggestionGenerator())
  }
}
