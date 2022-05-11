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

export const PYTHON_MEMBER = 'PYTHON_MEMBER'

export class PythonMember extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.setProperty('member', '')
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
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `.${this.getMember()}`),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonMember {
    const node = new PythonMember(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_MEMBER
    typeRegistration.deserializer = PythonMember.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_MEMBER, NodeCategory.PythonExpressionToken)
  }
}
