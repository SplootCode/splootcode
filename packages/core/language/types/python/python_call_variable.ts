import { ChildSetType } from '../../childset'
import { FunctionSignature } from '../../scope/types'
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
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { ScopeMutation, ScopeMutationType } from '../../mutations/scope_mutations'

export const PYTHON_CALL_VARIABLE = 'PYTHON_CALL_VARIABLE'

export class PythonCallVariable extends SplootNode {
  constructor(parentReference: ParentReference, name: string, signature?: FunctionSignature) {
    super(parentReference, PYTHON_CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    if (signature) {
      for (let i = 0; i < signature.arguments.length; i++) {
        this.getArguments().addChild(new PythonExpression(null))
      }
    }
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getIdentifier() {
    return this.properties.identifier
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
    const funcDef = scope.getVariableScopeEntryByName(this.getIdentifier())
    // TODO
    if (!funcDef) {
      return []
    }
    // TODO: Get function parameter names here
    // const res = funcDef.type.parameters.map((param) => param.name)
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
