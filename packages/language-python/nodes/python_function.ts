import {
  ErrorExpressionCategory,
  ErrorNode,
  FunctionNode,
  NameNode,
  ParameterCategory,
  ParameterNode,
  ParseNode,
  ParseNodeType,
} from 'structured-pyright'

import { ChildSetType } from '@splootcode/core/language/childset'
import { FunctionArgType, TypeCategory } from '@splootcode/core/language/scope/types'
import {
  FunctionCallData,
  FunctionDeclarationData,
  StatementCapture,
} from '@splootcode/core/language/capture/runtime_capture'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { NodeAnnotation, NodeAnnotationType } from '@splootcode/core/language/annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { NodeMutation, NodeMutationType } from '@splootcode/core/language/mutations/node_mutations'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { PythonScope } from '../scope/scope'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { VariableMetadata } from '@splootcode/core/language/scope/scope'

export const PYTHON_FUNCTION_DECLARATION = 'PYTHON_FUNCTION_DECLARATION'

class Generator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonFunctionDeclaration(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'function', 'function def', true, 'Define a new function')
    return [suggestedNode]
  }
}

export class PythonFunctionDeclaration extends PythonNode {
  runtimeCapture: FunctionDeclarationData
  runtimeCaptureFrame: number
  scopedName: string
  scopedParameters: Set<string>

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FUNCTION_DECLARATION)
    this.isRepeatableBlock = true
    this.runtimeCapture = null
    this.runtimeCaptureFrame = 0
    this.scopedName = null
    this.scopedParameters = new Set()

    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.PythonFunctionName)
    this.addChildSet('params', ChildSetType.Many, NodeCategory.PythonFunctionArgumentDeclaration)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getChildSet('body').addChild(new PythonStatement(null))
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

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    if (this.getIdentifier().getCount() === 0) {
      const errNode: ErrorNode = {
        nodeType: ParseNodeType.Error,
        category: ErrorExpressionCategory.MissingFunctionParameterList,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
      }
      return errNode
    }
    const nameNode: NameNode = (this.getIdentifier().getChild(0) as PythonIdentifier).generateParseTree(parseMapper)

    const funcNode: FunctionNode = {
      nodeType: ParseNodeType.Function,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      decorators: [],
      name: nameNode,
      parameters: [],
      suite: {
        nodeType: ParseNodeType.Suite,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        statements: [],
      },
    }
    nameNode.parent = funcNode
    funcNode.suite.parent = funcNode

    funcNode.parameters = this.getParams().children.map((node: PythonIdentifier) => {
      const paramNode: ParameterNode = {
        nodeType: ParseNodeType.Parameter,
        category: ParameterCategory.Simple,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        name: node.generateParseTree(parseMapper),
        parent: funcNode,
      }
      return paramNode
    })
    this.getBody().children.forEach((statementNode: PythonStatement) => {
      const statement = statementNode.generateParseTree(parseMapper)
      if (statement) {
        funcNode.suite.statements.push(statement)
        statement.parent = funcNode.suite
      }
    })
    return funcNode
  }

  validateSelf(): void {
    if (this.getIdentifier().getCount() === 0) {
      this.setValidity(false, 'Needs a name for the function', 'identifier')
    } else {
      this.setValidity(true, '')
    }
  }

  addSelfToScope() {
    let identifier = ''
    if (this.getIdentifier().getCount() === 0) {
      if (this.scopedName) {
        this.getScope(true).removeVariable(this.scopedName, this)
      }
      this.scopedName = null
    } else {
      identifier = (this.getIdentifier().getChild(0) as PythonIdentifier).getName()
      if (this.scopedName && identifier !== this.scopedName) {
        this.getScope(true).removeVariable(this.scopedName, this)
      }
      this.getScope(true).addVariable(
        identifier,
        {
          documentation: 'Local function',
          typeInfo: {
            category: TypeCategory.Function,
            arguments: this.getParams().children.map((child) => {
              return {
                name: (child as PythonIdentifier).getName(),
                type: FunctionArgType.PositionalOrKeyword,
              }
            }),
          },
        } as VariableMetadata,
        this
      )
      this.scopedName = identifier
    }

    const scope = this.getScope(false) as PythonScope
    if (!this.getProperty('id')) {
      this.setProperty('id', scope.registerFunction(this))
    }

    scope.setName(`Function ${identifier}`)
    const currentParams: Set<string> = new Set()

    this.getParams().children.forEach((paramNode) => {
      if (paramNode.type === PYTHON_IDENTIFIER) {
        const identifier = paramNode as PythonIdentifier
        currentParams.add(identifier.getName())
      }
    })
    currentParams.forEach((name) => {
      if (!this.scopedParameters.has(name)) {
        scope.addVariable(
          name,
          {
            documentation: 'Function parameter',
          },
          this
        )
        this.scopedParameters.add(name)
      }
    })
    this.scopedParameters.forEach((name) => {
      if (!currentParams.has(name)) {
        scope.removeVariable(name, this)
        this.scopedParameters.delete(name)
      }
    })
  }

  removeSelfFromScope(): void {
    if (this.scopedName) {
      this.getScope(true).removeVariable(this.scopedName, this)
    }
    this.scopedName = null
    this.getScope(true).removeChildScope(this.scope)
    this.scope = null
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'identifier', ['name']),
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
    registerNodeCateogry(PYTHON_FUNCTION_DECLARATION, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new Generator())
  }
}
