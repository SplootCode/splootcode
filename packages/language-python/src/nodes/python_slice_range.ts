import { ParseNodeType, SliceNode } from 'structured-pyright'

import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  TypeRegistration,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'

export const PYTHON_SLICE_RANGE = 'PY_SLICE_RANGE'

export class PythonSliceRange extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_SLICE_RANGE)
    this.addChildSet('start', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.addChildSet('end', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getStart().addChild(new PythonExpression(null))
    this.getEnd().addChild(new PythonExpression(null))
  }

  generateParseTree(parseMapper: ParseMapper): SliceNode {
    const sliceNode: SliceNode = {
      nodeType: ParseNodeType.Slice,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      startValue: (this.getStart().getChild(0) as PythonExpression).generateParseTree(parseMapper),
      endValue: (this.getEnd().getChild(0) as PythonExpression).generateParseTree(parseMapper),
    }
    if (sliceNode.startValue) {
      sliceNode.startValue.parent = sliceNode
    }
    if (sliceNode.endValue) {
      sliceNode.endValue.parent = sliceNode
    }
    return sliceNode
  }

  getStart() {
    return this.getChildSet('start')
  }

  getEnd() {
    return this.getChildSet('end')
  }

  isEmpty(): boolean {
    return this.getStart().getChild(0).isEmpty() && this.getEnd().getChild(0).isEmpty()
  }

  validateSelf(): void {}

  static deserializer(serializedNode: SerializedNode): PythonSliceRange {
    const node = new PythonSliceRange(null)
    node.deserializeChildSet('start', serializedNode)
    node.deserializeChildSet('end', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_SLICE_RANGE
    typeRegistration.deserializer = PythonSliceRange.deserializer
    typeRegistration.childSets = { start: NodeCategory.PythonExpression, end: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.KEYWORD,
      [
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'start', ['start']),
        new LayoutComponent(LayoutComponentType.SEPARATOR, ':'),
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'end', ['end']),
      ],
      NodeBoxType.INVISIBLE
    )

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_SLICE_RANGE, NodeCategory.PythonSliceRange)
    registerBlankFillForNodeCategory(NodeCategory.PythonSliceRange, () => {
      return new PythonSliceRange(null)
    })
  }
}
