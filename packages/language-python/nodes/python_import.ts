import { ImportAsNode, ImportNode, ParseNodeType } from 'structured-pyright'

import { ChildSetType } from '@splootcode/core/language/childset'
import { HighlightColorCategory } from '@splootcode/core/colors'
import { ImportStatementData, StatementCapture } from '@splootcode/core/language/capture/runtime_capture'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import {
  NodeAnnotation,
  NodeAnnotationType,
  getSideEffectAnnotations,
} from '@splootcode/core/language/annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { NodeMutation, NodeMutationType } from '@splootcode/core/language/mutations/node_mutations'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonModuleIdentifier } from './python_module_identifier'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { TypeCategory } from '@splootcode/language-python/scope/types'

export const PYTHON_IMPORT = 'PYTHON_IMPORT'

class Generator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonImport(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'import', 'import', true)
    return [suggestedNode]
  }
}

export class PythonImport extends PythonNode {
  scopedVariables: Set<string>

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_IMPORT)
    this.addChildSet('modules', ChildSetType.Many, NodeCategory.PythonModuleIdentifier)
    this.scopedVariables = new Set()
  }

  getModules() {
    return this.getChildSet('modules')
  }

  generateParseTree(parseMapper: ParseMapper): ImportNode {
    const importNode: ImportNode = {
      nodeType: ParseNodeType.Import,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      list: [],
    }
    importNode.list = this.getModules().children.map((moduleIdentifier: PythonModuleIdentifier): ImportAsNode => {
      const moduleNameNode = moduleIdentifier.generateParseTree(parseMapper)
      const importAsNode: ImportAsNode = {
        nodeType: ParseNodeType.ImportAs,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        parent: importNode,
        module: moduleNameNode,
      }
      moduleNameNode.parent = importAsNode

      parseMapper.addModuleImport({
        nameNode: importAsNode.module,
        leadingDots: importAsNode.module.leadingDots,
        nameParts: importAsNode.module.nameParts.map((p) => p.value),
        importedSymbols: undefined,
      })
      return importAsNode
    })
    return importNode
  }

  validateSelf(): void {
    if (this.getModules().getCount() === 0) {
      this.setValidity(false, 'Needs a module name to import', 'modules')
    } else {
      this.setValidity(true, '')
    }
  }

  addSelfToScope() {
    const currentNames: Set<string> = new Set()

    const scope = this.getScope()
    const modules = this.getModules()
    modules.children.forEach((moduleIdentifierNode) => {
      const identfier = moduleIdentifierNode as PythonModuleIdentifier
      currentNames.add(identfier.getName().split('.')[0])
    })
    currentNames.forEach((name) => {
      if (!this.scopedVariables.has(name)) {
        scope.addVariable(
          name,
          {
            documentation: 'Imported module',
            typeInfo: { category: TypeCategory.Value, typeName: 'module' },
          },
          this
        )
        this.scopedVariables.add(name)
        scope.loadModule(name)
      }
    })
    this.scopedVariables.forEach((name) => {
      if (!currentNames.has(name)) {
        scope.removeVariable(name, this)
        this.scopedVariables.delete(name)
      }
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

  removeSelfFromScope(): void {
    this.scopedVariables.forEach((name) => {
      this.getScope().removeVariable(name, this)
      this.scopedVariables.delete(name)
    })
  }

  static deserializer(serializedNode: SerializedNode): PythonImport {
    const node = new PythonImport(null)
    node.deserializeChildSet('modules', serializedNode)
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'modules', ['modules']),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_IMPORT, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new Generator())
  }
}
