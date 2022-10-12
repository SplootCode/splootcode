import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { NameNode, ParseNodeType, TokenType } from 'structured-pyright'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { PythonScope } from '../scope/python_scope'
import { ScopeMutation, ScopeMutationType } from '@splootcode/core/language/mutations/scope_mutations'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'

export const PYTHON_IDENTIFIER = 'PY_IDENTIFIER'

export function sanitizeIdentifier(textInput: string): string {
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
  description: string
  constructor(description: string) {
    this.description = description
  }
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    let varName = sanitizeIdentifier(textInput)
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      varName = '_' + varName
    }

    const newVar = new PythonIdentifier(null, varName)
    const suggestedNode = new SuggestedNode(newVar, `${varName}`, '', true, this.description)
    return [suggestedNode]
  }
}

export class PythonIdentifier extends PythonNode {
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

  getScope(): PythonScope {
    // Horrible hack to put function identifiers in a different scope to the arguments.
    if (this.parent && this.parent.childSetId == 'identifier') {
      return (this.parent.node as PythonNode).getScope(true)
    } else {
      return super.getScope()
    }
  }

  setEditablePropertyValue(newValue: string) {
    // const oldValue = this.getName()
    newValue = sanitizeIdentifier(newValue)
    if (newValue.length > 0) {
      this.removeSelfFromScope()
      this.setName(newValue)
      this.addSelfToScope()

      // TODO - also allow rename everywhere
      // this.getScope().renameIdentifier(oldValue, newValue)
    }
    return newValue
  }

  getName(): string {
    return this.getProperty('identifier')
  }

  generateParseTree(parseMapper: ParseMapper): NameNode {
    const nameNode: NameNode = {
      nodeType: ParseNodeType.Name,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      token: { type: TokenType.Identifier, start: 0, length: 0, value: this.getName() },
      value: this.getName(),
    }
    parseMapper.addNode(this, nameNode)
    return nameNode
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
      ;(this.parent?.node as PythonNode).addSelfToScope()
    }
  }

  addSelfToScope(): void {
    ;(this.parent?.node as PythonNode).addSelfToScope()
    this.getScope().addWatcher(this.getName(), this)
  }

  removeSelfFromScope(): void {
    ;(this.parent?.node as PythonNode).addSelfToScope()
    this.getScope()?.removeWatcher(this.getName(), this)
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_IDENTIFIER
    typeRegistration.deserializer = PythonIdentifier.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CAP, 'v'),
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

    registerAutocompleter(NodeCategory.PythonAssignable, new NewIdentifierGenerator('new variable'))
    registerAutocompleter(NodeCategory.PythonLoopVariable, new NewIdentifierGenerator('loop variable'))
    registerAutocompleter(NodeCategory.PythonFunctionName, new NewIdentifierGenerator('function name'))
    registerAutocompleter(
      NodeCategory.PythonFunctionArgumentDeclaration,
      new NewIdentifierGenerator('function argument')
    )
  }
}
