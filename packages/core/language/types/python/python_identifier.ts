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
import { VariableDefinition } from '../../definitions/loader'

export const PYTHON_IDENTIFIER = 'PY_IDENTIFIER'

function sanitizeIdentifier(textInput: string): string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ')
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

class ExistingVariableGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const scope = parent.node.getScope()
    const suggestions = scope.getAllVariableDefinitions().map((variableDef: VariableDefinition) => {
      const varName = variableDef.name
      const newVar = new PythonIdentifier(null, varName)
      let doc = variableDef.documentation
      if (!doc) {
        doc = 'No documentation'
      }
      return new SuggestedNode(newVar, `var ${varName}`, varName, true, doc)
    })
    return suggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return []
  }
}

class NewIdentifierGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput)
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      varName = '_' + varName
    }

    const newVar = new PythonIdentifier(null, varName)
    const suggestedNode = new SuggestedNode(newVar, `identifier ${varName}`, 'new variable', true, 'new variable')
    return [suggestedNode]
  }
}

export class PythonIdentifier extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PYTHON_IDENTIFIER)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  static deserializer(serializedNode: SerializedNode): PythonIdentifier {
    const node = new PythonIdentifier(null, serializedNode.properties.identifier)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_IDENTIFIER
    typeRegistration.deserializer = PythonIdentifier.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonAssignable, new ExistingVariableGenerator())
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonAssignable, new NewIdentifierGenerator())
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonExpressionToken, new ExistingVariableGenerator())
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonLoopVariable, new NewIdentifierGenerator())
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonModuleAttribute, new NewIdentifierGenerator())
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonFunctionName, new NewIdentifierGenerator())
    registerNodeCateogry(
      PYTHON_IDENTIFIER,
      NodeCategory.PythonFunctionArgumentDeclaration,
      new NewIdentifierGenerator()
    )
  }
}
