import { HighlightColorCategory } from '../../../colors'
import { VariableDefinition } from '../../definitions/loader'
import { ParentReference, SplootNode } from '../../node'
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from '../../node_category_registry'
import { SuggestedNode } from '../../suggested_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  registerType,
  SerializedNode,
  TypeRegistration,
} from '../../type_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'

export const PYTHON_VARIABLE_REFERENCE = 'PYTHON_VARIABLE_REFERENCE'

export function sanitizeIdentifier(textInput: string): string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ')
  // Only sanitise the variable name if it contains space or punctuation.
  if (textInput.indexOf(' ') !== -1) {
    // From SO: https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
    return textInput
      .split(' ')
      .map(function (word, index) {
        // If it is the first word make sure to lowercase all the chars.
        if (index == 0) {
          return word.toLowerCase()
        }
        // If it is not the first word only upper case the first char and lowercase the rest.
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join('')
  }
  return textInput
}

export class VariableReferenceGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const scope = parent.node.getScope()
    const suggestions = scope.getAllVariableDefinitions().map((variableDef: VariableDefinition) => {
      const varName = variableDef.name
      const newVar = new PythonVariableReference(null, varName)
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

export class AssignableVariableReferenceGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const scope = parent.node.getScope()
    const suggestions = scope.getAllVariableDefinitions().map((variableDef: VariableDefinition) => {
      const varName = variableDef.name
      const newVar = new PythonVariableReference(null, varName)
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
    varType.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(varType)
    registerNodeCateogry(
      PYTHON_VARIABLE_REFERENCE,
      NodeCategory.PythonExpressionToken,
      new VariableReferenceGenerator()
    )
  }
}
