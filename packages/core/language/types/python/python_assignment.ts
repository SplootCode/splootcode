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
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '../../node'
import { PythonExpression } from './python_expression'
import { PythonStatement } from './python_statement'
import { SingleStatementData, StatementCapture } from '../../capture/runtime_capture'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_ASSIGNMENT = 'PYTHON_ASSIGNMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonAssignment(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'set', 'set', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonAssignment extends SplootNode {
  scopedVariables: Set<string>

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ASSIGNMENT)
    this.addChildSet('left', ChildSetType.Many, NodeCategory.PythonAssignable)
    this.addChildSet('right', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('right').addChild(new PythonExpression(null))
    this.scopedVariables = new Set()
  }

  getLeft() {
    return this.getChildSet('left')
  }

  getRight() {
    return this.getChildSet('right')
  }

  validateSelf(): void {
    ;(this.getRight().getChild(0) as PythonExpression).requireNonEmpty('Needs a value for the variable to point to.')
    if (this.getLeft().getCount() === 0) {
      this.setValidity(false, 'Needs a name for the variable', 'left')
    } else {
      this.setValidity(true, '')
    }
  }

  addSelfToScope() {
    const identifierChildSet = this.getLeft()
    const currentNames: Set<string> = new Set()
    for (const leftChild of identifierChildSet.children) {
      if (leftChild.type === PYTHON_IDENTIFIER) {
        const name = (leftChild as PythonIdentifier).getName()
        currentNames.add(name)
      }
    }
    currentNames.forEach((name) => {
      if (!this.scopedVariables.has(name)) {
        this.getScope().addVariable(
          name,
          {
            documentation: 'Variable',
          },
          this
        )
        this.scopedVariables.add(name)
      }
    })
    this.scopedVariables.forEach((name) => {
      if (!currentNames.has(name)) {
        this.getScope().removeVariable(name, this)
        this.scopedVariables.delete(name)
      }
    })
  }

  removeSelfFromScope(): void {
    this.scopedVariables.forEach((name) => {
      this.getScope().removeVariable(name, this)
      this.scopedVariables.delete(name)
    })
  }

  getLeftAsString(): string {
    const identifierChildSet = this.getLeft()
    if (identifierChildSet.getCount() === 1 && identifierChildSet.getChild(0).type === PYTHON_IDENTIFIER) {
      return (this.getLeft().getChild(0) as PythonIdentifier).getName()
    }
    // TODO: Handle things like subscripts and upacking for annotations
    return ''
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type == 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }

    const annotations: NodeAnnotation[] = getSideEffectAnnotations(capture)
    const data = capture.data as SingleStatementData
    annotations.push({
      type: NodeAnnotationType.Assignment,
      value: {
        variableName: this.getLeftAsString(),
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

  static deserializer(serializedNode: SerializedNode): PythonAssignment {
    const node = new PythonAssignment(null)
    node.deserializeChildSet('left', serializedNode)
    node.getRight().removeChild(0)
    node.deserializeChildSet('right', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ASSIGNMENT
    typeRegistration.deserializer = PythonAssignment.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      left: NodeCategory.PythonAssignable,
      right: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'set'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'left'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'right', 'to'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ASSIGNMENT, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new Generator())
  }
}
