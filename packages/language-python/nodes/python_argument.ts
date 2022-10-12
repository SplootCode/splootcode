import { ArgumentCategory, ArgumentNode, ErrorExpressionCategory, ParseNodeType } from 'structured-pyright'
import { ChildSetType } from '@splootcode/core/language/childset'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import {
  NodeCategory,
  registerAutocompleteAdapter,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'

export const PYTHON_ARGUMENT = 'PY_ARG'

export class PythonArgument extends PythonNode {
  constructor(parentReference: ParentReference, name?: string) {
    super(parentReference, PYTHON_ARGUMENT)
    this.addChildSet('argument', ChildSetType.Single, NodeCategory.PythonFunctionArgumentValue)
  }

  getArgument() {
    return this.getChildSet('argument')
  }

  isEmpty(): boolean {
    return this.getArgument().children.length === 0
  }

  clean() {
    if (this.getArgument().getCount() !== 0) {
      const argument = this.getArgument().getChild(0)
      if (argument.type === PYTHON_EXPRESSION && (argument as PythonExpression).getTokenSet().getCount() === 0) {
        this.getArgument().removeChild(0)
      }
    }
  }

  generateParseTree(parseMapper: ParseMapper): ArgumentNode {
    if (this.getArgument().getCount() === 0) {
      //  TODO: Empty expression node should go here ?
      const ret: ArgumentNode = {
        nodeType: ParseNodeType.Argument,
        argumentCategory: ArgumentCategory.Simple,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        valueExpression: {
          nodeType: ParseNodeType.Error,
          category: ErrorExpressionCategory.MissingExpression,
          id: parseMapper.getNextId(),
          start: 0,
          length: 0,
        },
      }
      ret.valueExpression.parent = ret
      return ret
    }

    const argument = this.getArgument().getChild(0)
    if (argument.type === PYTHON_EXPRESSION) {
      const valueExpression = (argument as PythonExpression).generateParseTree(parseMapper)
      const ret: ArgumentNode = {
        nodeType: ParseNodeType.Argument,
        argumentCategory: ArgumentCategory.Simple,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        valueExpression: null,
      }
      ret.valueExpression = valueExpression
      ret.valueExpression.parent = ret
      return ret
    } else {
      // Other arg types return an argument.
      return (argument as PythonNode).generateParseTree(parseMapper) as ArgumentNode
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonArgument {
    const res = new PythonArgument(null)
    res.deserializeChildSet('argument', serializedNode)
    res.clean()
    return res
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ARGUMENT
    typeRegistration.deserializer = PythonArgument.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = { value: NodeCategory.PythonFunctionArgumentValue }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.NONE,
      [new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'argument')],
      NodeBoxType.INVISIBLE
    )
    typeRegistration.pasteAdapters = {}

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ARGUMENT, NodeCategory.PythonFunctionArgument)

    registerAutocompleteAdapter(NodeCategory.PythonFunctionArgument, NodeCategory.PythonFunctionArgumentValue)

    registerBlankFillForNodeCategory(NodeCategory.PythonFunctionArgument, () => {
      return new PythonArgument(null)
    })
  }
}
