import {
  ArgumentCategory,
  ArgumentNode,
  ErrorExpressionCategory,
  ExpressionNode,
  IndexNode,
  ParseNodeType,
  SliceNode,
} from 'structured-pyright'
import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { PYTHON_BRACKETS } from './python_brackets'
import { PYTHON_CALL_MEMBER } from './python_call_member'
import { PYTHON_CALL_VARIABLE } from './python_call_variable'
import { PYTHON_DICT } from './python_dictionary'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { PYTHON_IDENTIFIER } from './python_identifier'
import { PYTHON_LIST } from './python_list'
import { PYTHON_MEMBER } from './python_member'
import { PYTHON_STRING } from './python_string'
import { PYTHON_TUPLE } from './python_tuple'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { PythonSliceRange } from './python_slice_range'

export const PY_SLICE = 'PY_SLICE'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const leftChild = parent.getChildSet().getChild(index - 1)
    if (
      leftChild &&
      [
        PYTHON_IDENTIFIER,
        PYTHON_CALL_MEMBER,
        PYTHON_CALL_VARIABLE,
        PYTHON_MEMBER,
        PY_SLICE,
        PYTHON_STRING,
        PYTHON_BRACKETS,
        PYTHON_LIST,
        PYTHON_TUPLE,
        PYTHON_DICT,
      ].indexOf(leftChild.type) !== -1
    ) {
      const node = new PythonSlice(null)
      return [new SuggestedNode(node, `slice`, 'slice', true, 'Access a section a list', 'target')]
    }

    return []
  }
}

export class PythonSlice extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PY_SLICE)
    this.addChildSet('target', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.addChildSet('slicerange', ChildSetType.Immutable, NodeCategory.PythonSliceRange, 1)

    this.getSliceRange().addChild(new PythonSliceRange(null))
  }

  getTarget() {
    return this.getChildSet('target')
  }

  getSliceRange() {
    return this.getChildSet('slicerange')
  }

  getChildrenToKeepOnDelete(): SplootNode[] {
    return this.getTarget().children
  }

  generateParseTree(parseMapper: ParseMapper): IndexNode {
    let targetExpression: ExpressionNode
    if (this.getTarget().getCount() === 0) {
      targetExpression = {
        nodeType: ParseNodeType.Error,
        category: ErrorExpressionCategory.MissingExpression,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
      }
    } else {
      targetExpression = (this.getTarget().getChild(0) as PythonNode).generateParseTree(parseMapper) as ExpressionNode
    }

    let sliceRange: SliceNode | ExpressionNode
    if (this.getSliceRange().getCount() !== 0) {
      sliceRange = {
        nodeType: ParseNodeType.Error,
        category: ErrorExpressionCategory.MissingIndexOrSlice,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
      }
    } else {
      sliceRange = (this.getSliceRange().getChild(0) as PythonSliceRange).generateParseTree(parseMapper)
    }

    const argNode: ArgumentNode = {
      nodeType: ParseNodeType.Argument,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      argumentCategory: ArgumentCategory.Simple,
      valueExpression: sliceRange,
    }
    if (argNode.valueExpression) {
      argNode.valueExpression.parent = argNode
    }

    const indexNode: IndexNode = {
      nodeType: ParseNodeType.Index,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      baseExpression: targetExpression,
      items: [argNode],
      trailingComma: false,
    }
    argNode.parent = indexNode
    if (indexNode.baseExpression) {
      indexNode.baseExpression.parent = indexNode
    }
    parseMapper.addNode(this, indexNode)
    return indexNode
  }

  validateSelf(): void {
    if (this.getTarget().getCount() === 0) {
      this.setValidity(false, 'Needs a collection to take a slice from, e.g. a list', 'target')
    } else {
      this.setValidity(true, '')
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonSlice {
    const node = new PythonSlice(null)
    node.deserializeChildSet('target', serializedNode)
    node.deserializeChildSet('slicerange', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PY_SLICE
    typeRegistration.deserializer = PythonSlice.deserializer
    typeRegistration.childSets = {
      target: NodeCategory.PythonExpressionToken,
      slicerange: NodeCategory.PythonSliceRange,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'target', ['list']),
      new LayoutComponent(LayoutComponentType.KEYWORD, `slice`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'slicerange', undefined, { brackets: true }),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PY_SLICE, NodeCategory.PythonExpressionToken)
    registerNodeCateogry(PY_SLICE, NodeCategory.PythonAssignable)

    registerAutocompleter(NodeCategory.PythonExpressionToken, new Generator())
  }
}
