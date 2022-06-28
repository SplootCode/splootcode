import * as recast from 'recast'

import { ChildSet, ChildSetType } from '@splootcode/core/language/childset'
import { ExpressionKind } from 'ast-types/gen/kinds'
import { HighlightColorCategory } from '@splootcode/core/colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core/language/node_category_registry'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const LOGICAL_EXPRESSION = 'LOGICAL_EXPRESSION'

export class LogicalExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, LOGICAL_EXPRESSION)
    this.setProperty('operator', '')
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression)
  }

  setOperator(operator: string) {
    this.setProperty('operator', operator)
  }

  getOperator(): '&&' | '||' {
    return this.getProperty('operator')
  }

  getArguments(): ChildSet {
    return this.getChildSet('arguments')
  }

  generateJsAst(): ExpressionKind {
    const args = this.getArguments()
    let lhsExpression = (args.getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    args.children.slice(1).forEach((child: SplootExpression) => {
      const rhsExpression = child.generateJsAst() as ExpressionKind
      lhsExpression = recast.types.builders.logicalExpression(this.getOperator(), lhsExpression, rhsExpression)
    })
    return lhsExpression
  }

  static deserialize(serializedNode: SerializedNode): LogicalExpression {
    const node = new LogicalExpression(null)
    node.setOperator(serializedNode.properties['operator'])
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  getNodeLayout() {
    return new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.KEYWORD, this.getOperator() === '&&' ? 'AND' : 'OR'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = LOGICAL_EXPRESSION
    typeRegistration.deserializer = LogicalExpression.deserialize
    typeRegistration.properties = ['operator']
    typeRegistration.childSets = { init: NodeCategory.ExpressionToken }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'operator'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(LOGICAL_EXPRESSION, NodeCategory.ExpressionToken)
  }
}
