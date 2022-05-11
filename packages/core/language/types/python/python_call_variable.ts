import { ChildSetType } from '../../childset'
import { FunctionArgType, FunctionSignature, TypeCategory } from '../../scope/types'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, registerNodeCateogry } from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { ScopeMutation, ScopeMutationType } from '../../mutations/scope_mutations'

export const PYTHON_CALL_VARIABLE = 'PYTHON_CALL_VARIABLE'

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

export class PythonCallVariable extends SplootNode {
  constructor(parentReference: ParentReference, name: string, signature?: FunctionSignature) {
    super(parentReference, PYTHON_CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    if (signature) {
      for (const arg of signature.arguments) {
        if (
          (arg.type == FunctionArgType.PositionalOnly || arg.type == FunctionArgType.PositionalOrKeyword) &&
          !arg.defaultValue
        ) {
          this.getArguments().addChild(new PythonExpression(null))
        }
      }
      if (this.getArguments().getCount() === 0) {
        this.getArguments().addChild(new PythonExpression(null))
      }
    }
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getIdentifier() {
    return this.getProperty('identifier')
  }

  getEditableProperty(): string {
    if (this.getScope().canRename(this.getIdentifier())) {
      return 'identifier'
    }
    return null
  }

  setEditablePropertyValue(newValue: string) {
    const oldValue = this.getIdentifier()
    newValue = sanitizeIdentifier(newValue)
    if (newValue.length > 0) {
      this.getScope().renameIdentifier(oldValue, newValue)
    }
  }

  setIdentifier(identifier: string) {
    this.setProperty('identifier', identifier)
  }

  handleScopeMutation(mutation: ScopeMutation) {
    if (mutation.type === ScopeMutationType.RENAME_ENTRY) {
      const oldName = this.getIdentifier()
      if (mutation.previousName !== oldName) {
        console.warn(
          `Rename mutation received ${mutation.previousName} -> ${mutation.newName} but node name is ${oldName}`
        )
      }
      this.setIdentifier(mutation.newName)
    }
    if (mutation.type === ScopeMutationType.ADD_OR_UPDATE_ENTRY || mutation.type === ScopeMutationType.REMOVE_ENTRY) {
      const mutation = new NodeMutation()
      mutation.type = NodeMutationType.UPDATE_NODE_LAYOUT
      mutation.node = this
      this.fireMutation(mutation)
    }
  }

  addSelfToScope(): void {
    this.getScope().addWatcher(this.getIdentifier(), this)
  }

  removeSelfFromScope(): void {
    this.getScope().removeWatcher(this.getIdentifier(), this)
  }

  validateSelf(): void {
    const elements = this.getArguments().children
    if (elements.length == 1) {
      ;(elements[0] as PythonExpression).allowEmpty()
    } else {
      elements.forEach((expression: PythonExpression, idx) => {
        // TODO: Add function argument names when required
        expression.requireNonEmpty('Cannot have empty function arguments')
      })
    }
  }

  getArgumentNames(): string[] {
    const scope = this.getScope()
    if (!scope) {
      return []
    }
    const scopeEntry = scope.getVariableScopeEntryByName(this.getIdentifier())
    if (!scopeEntry) {
      return []
    }

    if (scopeEntry.builtIn && scopeEntry.builtIn.typeInfo.category === TypeCategory.Function) {
      return scopeEntry.builtIn.typeInfo.arguments
        .filter((arg) => {
          return arg.type === FunctionArgType.PositionalOnly || arg.type === FunctionArgType.PositionalOrKeyword
        })
        .map((arg) => {
          return arg.name
        })
    }

    for (const meta of scopeEntry.declarers.values()) {
      if (meta.typeInfo?.category === TypeCategory.Function) {
        const args = meta.typeInfo.arguments.map((arg) => {
          return arg.name
        })
        return args
      }
      if (meta.typeInfo?.category === TypeCategory.ModuleAttribute) {
        const typeInfo = scope.getModuleAttributeTypeInfo(meta.typeInfo.module, meta.typeInfo.attribute)
        if (typeInfo.category === TypeCategory.Function) {
          const args = typeInfo.arguments.map((arg) => {
            return arg.name
          })
          return args
        }
      }
    }

    return []
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments', this.getArgumentNames()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonCallVariable {
    const node = new PythonCallVariable(null, serializedNode.properties['identifier'])
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CALL_VARIABLE
    typeRegistration.deserializer = PythonCallVariable.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CALL_VARIABLE, NodeCategory.PythonExpressionToken)
  }
}
