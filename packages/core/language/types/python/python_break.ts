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
import { PythonStatement } from './python_statement'
import { StatementCapture } from '../../capture/runtime_capture'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_BREAK = 'PY_BREAK'

class BreakGenerator implements SuggestionGenerator {
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
    const sampleNode = new PythonBreak(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'break', 'break', true)
    return [suggestedNode]
  }
}

export class PythonBreak extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_BREAK)
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
    this.setValidity(false, 'break can only be used inside a loop')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    return false
  }

  static deserializer(serializedNode: SerializedNode): PythonBreak {
    const node = new PythonBreak(null)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_BREAK
    typeRegistration.deserializer = PythonBreak.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      value: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'break'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_BREAK, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new BreakGenerator())
  }
}
