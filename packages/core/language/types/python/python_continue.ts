import { ContinueNode, ParseNodeType } from 'structured-pyright'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { PYTHON_FOR_LOOP } from './python_for'
import { PYTHON_WHILE_LOOP } from './python_while'
import { ParentReference, SplootNode } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { StatementCapture } from '../../capture/runtime_capture'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_CONTINUE = 'PY_CONTINUE'

class ContinueGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    let insideLoop = false
    let node = parent.node
    while (node) {
      if (node.type == PYTHON_FOR_LOOP || node.type == PYTHON_WHILE_LOOP) {
        insideLoop = true
        break
      }
      node = node?.parent?.node
    }
    if (!insideLoop) {
      return []
    }
    const sampleNode = new PythonContinue(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'continue', 'continue', true)
    return [suggestedNode]
  }
}

export class PythonContinue extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_CONTINUE)
  }

  generateParseTree(parseMapper: ParseMapper): ContinueNode {
    return {
      nodeType: ParseNodeType.Continue,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
    }
  }

  validateSelf(): void {
    let parent = this.parent?.node
    while (parent) {
      if (parent.type == PYTHON_FOR_LOOP || parent.type == PYTHON_WHILE_LOOP) {
        this.setValidity(true, '')
        return
      }
      parent = parent?.parent?.node
    }
    this.setValidity(false, 'continue can only be used inside a loop')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    return false
  }

  static deserializer(serializedNode: SerializedNode): PythonContinue {
    const node = new PythonContinue(null)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CONTINUE
    typeRegistration.deserializer = PythonContinue.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {}
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'continue'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CONTINUE, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new ContinueGenerator())
  }
}
