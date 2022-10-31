import { ArgumentCategory, ArgumentNode, NameNode, ParseNodeType, TokenType } from 'structured-pyright'
import { ChildSetType } from '@splootcode/core'
import { HighlightColorCategory } from '@splootcode/core'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core'
import { ParentReference, SplootNode } from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonArgument } from './python_argument'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'

export const PYTHON_KEWORD_ARGUMENT = 'PY_KWARG'

export class PythonKeywordArgument extends PythonNode {
  constructor(parentReference: ParentReference, name?: string) {
    super(parentReference, PYTHON_KEWORD_ARGUMENT)
    this.setProperty('name', name || '')
    this.addChildSet('value', ChildSetType.Single, NodeCategory.PythonExpression, 1)
    this.getValue().addChild(new PythonExpression(null))
  }

  getValue() {
    return this.getChildSet('value')
  }

  getName(): string {
    return this.getProperty('name')
  }

  validateSelf(): void {
    ;(this.getValue().getChild(0) as PythonExpression).requireNonEmpty('Keyword argument requires a value')
  }

  generateParseTree(parseMapper: ParseMapper): ArgumentNode {
    const expr = this.getValue().getChild(0)
    const argName: NameNode = {
      nodeType: ParseNodeType.Name,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      token: { type: TokenType.Identifier, start: 0, length: 0, value: this.getName() },
      value: this.getName(),
    }

    const ret: ArgumentNode = {
      nodeType: ParseNodeType.Argument,
      argumentCategory: ArgumentCategory.Simple,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      valueExpression: null,
      name: argName,
    }
    argName.parent = ret
    const valueExpression = (expr as PythonExpression).generateParseTree(parseMapper)
    ret.valueExpression = valueExpression
    ret.valueExpression.parent = ret
    return ret
  }

  static deserializer(serializedNode: SerializedNode): PythonKeywordArgument {
    const res = new PythonKeywordArgument(null, serializedNode.properties['name'])
    res.deserializeChildSet('value', serializedNode)
    res.clean()
    return res
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_KEWORD_ARGUMENT
    typeRegistration.deserializer = PythonKeywordArgument.deserializer
    typeRegistration.properties = ['name']
    typeRegistration.childSets = { value: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.OPERATOR,
      [
        new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
        new LayoutComponent(LayoutComponentType.KEYWORD, '='),
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'value', ['value']),
      ],
      NodeBoxType.STANDARD_BLOCK
    )
    typeRegistration.pasteAdapters = {
      PY_ARG: (node: SplootNode) => {
        const arg = new PythonArgument(null)
        arg.getArgument().addChild(node)
        return arg
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_KEWORD_ARGUMENT, NodeCategory.PythonFunctionArgumentValue)
  }
}
