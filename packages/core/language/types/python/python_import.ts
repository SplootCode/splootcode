import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
import { ImportStatementData, StatementCapture } from '../../capture/runtime_capture'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeAnnotation, NodeAnnotationType, getSideEffectAnnotations } from '../../annotations/annotations'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { ParentReference, SplootNode } from '../../node'
import { PythonModuleIdentifier } from './python_module_identifier'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_IMPORT = 'PYTHON_IMPORT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonImport(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'import', 'import', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonImport extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_IMPORT)
    this.addChildSet('modules', ChildSetType.Many, NodeCategory.PythonModuleIdentifier)
  }

  getModules() {
    return this.getChildSet('modules')
  }

  validateSelf(): void {
    if (this.getModules().getCount() === 0) {
      this.setValidity(false, 'Needs a module name to import')
    } else {
      this.setValidity(true, '')
    }
  }

  addSelfToScope() {
    const scope = this.getScope()
    const modules = this.getModules()
    modules.children.forEach((moduleIdentifierNode) => {
      const identfier = moduleIdentifierNode as PythonModuleIdentifier
      // TODO: Better scope handling
      scope.addVariable({
        name: identfier.getName().split('.')[0],
        deprecated: false,
        documentation: 'imported module',
        type: { type: 'any' },
      })
    })
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type == 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }

    const data = capture.data as ImportStatementData
    const statementCap = data.import[0]
    if (statementCap && statementCap.type === 'EXCEPTION') {
      this.applyRuntimeError(statementCap)
      return true
    }

    const annotations: NodeAnnotation[] = getSideEffectAnnotations(capture)
    annotations.push({
      type: NodeAnnotationType.SideEffect,
      value: {
        message: ``,
      },
    })
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotations
    this.fireMutation(mutation)
    return true
  }

  static deserializer(serializedNode: SerializedNode): PythonImport {
    const node = new PythonImport(null)
    node.deserializeChildSet('module', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_IMPORT
    typeRegistration.deserializer = PythonImport.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      modules: NodeCategory.PythonModuleIdentifier,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'import'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'modules'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_IMPORT, NodeCategory.PythonStatementContents, new Generator())
  }
}
