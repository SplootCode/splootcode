import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { Scope } from '../../scope/scope'
import { ScopeMutation, ScopeMutationType } from '../../mutations/scope_mutations'
import { SuggestedNode } from '../../autocomplete/suggested_node'

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

class NewIdentifierGenerator implements SuggestionGenerator {
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

  getEditableProperty(): string {
    return 'identifier'
  }

  getScope(): Scope {
    // Horrible hack to put function identifiers in a different scope to the arguments.
    if (this.parent && this.parent.childSetId == 'identifier') {
      return this.parent.node.getScope(true)
    } else {
      return super.getScope()
    }
  }

  setEditablePropertyValue(newValue: string) {
    const oldValue = this.getName()
    newValue = sanitizeIdentifier(newValue)
    if (newValue.length > 0) {
      this.getScope().renameIdentifier(oldValue, newValue)
    }
  }

  getName(): string {
    return this.getProperty('identifier')
  }

  static deserializer(serializedNode: SerializedNode): PythonIdentifier {
    const node = new PythonIdentifier(null, serializedNode.properties.identifier)
    return node
  }

  handleScopeMutation(mutation: ScopeMutation) {
    if (mutation.type === ScopeMutationType.RENAME_ENTRY) {
      const oldName = this.getName()
      if (mutation.previousName !== oldName) {
        console.warn(
          `Rename mutation received ${mutation.previousName} -> ${mutation.newName} but node name is ${oldName}`
        )
      }
      this.setName(mutation.newName)
      this.parent?.node.addSelfToScope()
    }
  }

  addSelfToScope(): void {
    this.parent?.node.addSelfToScope()
    this.getScope().addWatcher(this.getName(), this)
  }

  removeSelfFromScope(): void {
    this.parent?.node.addSelfToScope()
    this.getScope().removeWatcher(this.getName(), this)
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_IDENTIFIER
    typeRegistration.deserializer = PythonIdentifier.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonAssignable)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonExpressionToken)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonLoopVariable)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonModuleAttribute)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonFunctionName)
    registerNodeCateogry(PYTHON_IDENTIFIER, NodeCategory.PythonFunctionArgumentDeclaration)

    registerAutocompleter(NodeCategory.PythonAssignable, new NewIdentifierGenerator())
    registerAutocompleter(NodeCategory.PythonLoopVariable, new NewIdentifierGenerator())
    registerAutocompleter(NodeCategory.PythonModuleAttribute, new NewIdentifierGenerator())
    registerAutocompleter(NodeCategory.PythonFunctionName, new NewIdentifierGenerator())
    registerAutocompleter(NodeCategory.PythonFunctionArgumentDeclaration, new NewIdentifierGenerator())
  }
}
