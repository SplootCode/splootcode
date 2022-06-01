import { ParseNodeType, ReturnNode } from 'structured-pyright'

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
import { NodeAnnotation, NodeAnnotationType, getSideEffectAnnotations } from '../../annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_FUNCTION_DECLARATION } from './python_function'
import { ParentReference, SplootNode } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { SingleStatementData, StatementCapture } from '../../capture/runtime_capture'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_RETURN = 'PYTHON_RETURN'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    if (!parent.node.getScope().isInside(PYTHON_FUNCTION_DECLARATION)) {
      return []
    }
    const sampleNode = new PythonReturn(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'return', 'return', true)
    return [suggestedNode]
  }
}

export class PythonReturn extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_RETURN)
    this.addChildSet('value', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('value').addChild(new PythonExpression(null))
  }

  getValue() {
    return this.getChildSet('value')
  }

  generateParseTree(parseMapper: ParseMapper): ReturnNode {
    const retNode: ReturnNode = {
      nodeType: ParseNodeType.Return,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      returnExpression: (this.getValue().getChild(0) as PythonExpression).generateParseTree(parseMapper),
    }
    if (retNode.returnExpression) {
      retNode.returnExpression.parent = retNode
    }
    return retNode
  }

  validateSelf(): void {
    ;(this.getValue().getChild(0) as PythonExpression).allowEmpty()
    let parent = this.parent?.node
    while (parent) {
      if (parent.type == PYTHON_FUNCTION_DECLARATION) {
        this.setValidity(true, '')
        return
      }
      parent = parent?.parent?.node
    }
    this.setValidity(false, 'return can only be used inside a function')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type == 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != 'PYTHON_RETURN') {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }

    const annotations: NodeAnnotation[] = getSideEffectAnnotations(capture)
    const data = capture.data as SingleStatementData
    annotations.push({
      type: NodeAnnotationType.ReturnValue,
      value: {
        type: data.resultType,
        value: data.result,
      },
    })
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotations
    this.fireMutation(mutation)
    return true
  }

  static deserializer(serializedNode: SerializedNode): PythonReturn {
    const node = new PythonReturn(null)
    node.getValue().removeChild(0)
    node.deserializeChildSet('value', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_RETURN
    typeRegistration.deserializer = PythonReturn.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      value: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'return'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_RETURN, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new Generator())
  }
}
