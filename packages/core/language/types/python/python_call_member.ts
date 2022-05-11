import { ChildSetType } from '../../childset'
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

export const PYTHON_CALL_MEMBER = 'PYTHON_CALL_MEMBER'

export class PythonCallMember extends SplootNode {
  constructor(parentReference: ParentReference, argCount = 0) {
    super(parentReference, PYTHON_CALL_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.setProperty('member', '')
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    for (let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new PythonExpression(null))
    }
  }

  getObjectExpressionToken() {
    return this.getChildSet('object')
  }

  getMember(): string {
    return this.getProperty('member')
  }

  setMember(identifier: string) {
    this.setProperty('member', identifier)
  }

  getChildrenToKeepOnDelete(): SplootNode[] {
    return this.getObjectExpressionToken().children
  }

  validateSelf(): void {
    if (this.getObjectExpressionToken().getCount() === 0) {
      this.setValidity(false, 'Needs object', 'object')
    } else {
      this.setValidity(true, '')
    }
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

  getArguments() {
    return this.getChildSet('arguments')
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `.${this.getMember()}`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonCallMember {
    const node = new PythonCallMember(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CALL_MEMBER
    typeRegistration.deserializer = PythonCallMember.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CALL_MEMBER, NodeCategory.PythonExpressionToken)
  }
}
