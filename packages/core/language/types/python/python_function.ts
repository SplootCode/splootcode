import { ChildSetType } from '../../childset'
import { FunctionCallData, FunctionDeclarationData, StatementCapture } from '../../capture/runtime_capture'
import { FunctionDefinition } from '../../definitions/loader'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeAnnotation, NodeAnnotationType } from '../../annotations/annotations'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '../../node'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../suggested_node'
import { registerFunction } from '../../scope/scope'

export const PYTHON_FUNCTION_DECLARATION = 'PYTHON_FUNCTION_DECLARATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonFunctionDeclaration(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'function', 'function def', true, 'Define a new function')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonFunctionDeclaration extends SplootNode {
  runtimeCapture: FunctionDeclarationData
  runtimeCaptureFrame: number

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FUNCTION_DECLARATION)
    this.isRepeatableBlock = true
    this.runtimeCapture = null
    this.runtimeCaptureFrame = 0
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.PythonFunctionName)
    this.addChildSet('params', ChildSetType.Many, NodeCategory.PythonFunctionArgumentDeclaration)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.PythonStatement)
    this.setProperty('id', null)
  }

  getIdentifier() {
    return this.getChildSet('identifier')
  }

  getParams() {
    return this.getChildSet('params')
  }

  getBody() {
    return this.getChildSet('body')
  }

  addSelfToScope() {
    if (this.getIdentifier().getCount() === 0) {
      // No identifier, we can't be added to the scope.
      return
    }
    if (!this.getProperty('id')) {
      this.setProperty('id', registerFunction(this))
    }
    const identifier = (this.getIdentifier().getChild(0) as PythonIdentifier).getName()
    this.getScope(true).addFunction({
      name: identifier,
      deprecated: false,
      documentation: 'Local function',
      type: {
        parameters: [],
        returnType: { type: 'any' },
      },
    } as FunctionDefinition)

    const scope = this.getScope(false)
    this.getParams().children.forEach((paramNode) => {
      if (paramNode.type === PYTHON_IDENTIFIER) {
        const identifier = paramNode as PythonIdentifier
        scope.addVariable({
          name: identifier.getName(),
          deprecated: false,
          type: { type: 'any' },
          documentation: 'Function parameter',
        })
      }
    })
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type != this.type) {
      return false
    }
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      this.runtimeCapture = null
      return true
    }
    const data = capture.data as FunctionDeclarationData
    this.runtimeCapture = data
    this.selectRuntimeCaptureFrame(this.runtimeCaptureFrame)
    return true
  }

  selectRuntimeCaptureFrame(index: number) {
    if (!this.runtimeCapture) {
      this.recursivelyClearRuntimeCapture()
      return
    }
    this.runtimeCaptureFrame = index
    index = Math.min(this.runtimeCapture.calls.length - 1, index)
    if (index == -1) {
      index = this.runtimeCapture.calls.length - 1
    }
    const annotation: NodeAnnotation[] = []

    const frames = this.runtimeCapture.calls
    const frame = frames[index]

    if (frame.type === 'EXCEPTION') {
      annotation.push({
        type: NodeAnnotationType.RuntimeError,
        value: {
          errorType: frame.exceptionType,
          errorMessage: frame.exceptionMessage,
        },
      })
    } else {
      const frameData = frame.data as FunctionCallData
      this.getBody().recursivelyApplyRuntimeCapture(frameData.body)
    }
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotation
    mutation.loopAnnotation = { label: 'Called', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
    this.fireMutation(mutation)
  }

  recursivelyClearRuntimeCapture() {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    mutation.loopAnnotation = {
      label: 'Called',
      currentFrame: 0,
      iterations: 0,
    }
    this.fireMutation(mutation)
    this.getBody().recursivelyApplyRuntimeCapture([])
  }

  static deserializer(serializedNode: SerializedNode): PythonFunctionDeclaration {
    const node = new PythonFunctionDeclaration(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.deserializeChildSet('params', serializedNode)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_FUNCTION_DECLARATION
    typeRegistration.deserializer = PythonFunctionDeclaration.deserializer
    typeRegistration.hasScope = true
    typeRegistration.properties = ['identifier']
    typeRegistration.childSets = { params: NodeCategory.DeclaredIdentifier, body: NodeCategory.Statement }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'function'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'params'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_FUNCTION_DECLARATION, NodeCategory.PythonStatementContents, new Generator())
  }
}
