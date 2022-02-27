import * as recast from 'recast'

import { ASTNode } from 'ast-types'
import { ChildSetType } from '../../childset'
import { ExpressionKind } from 'ast-types/gen/kinds'
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
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
import { ParentReference, SplootNode } from '../../node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { SuggestedNode } from '../../suggested_node'

export const IF_STATEMENT = 'IF_STATEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new IfStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'if', 'if', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class IfStatement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, IF_STATEMENT)
    this.addChildSet('condition', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('condition').addChild(new SplootExpression(null))
    this.addChildSet('trueblock', ChildSetType.Many, NodeCategory.Statement)
    // this.addChildSet('elseblock', ChildSetType.Many, NodeCategory.Statement);
  }

  getCondition() {
    return this.getChildSet('condition')
  }

  getTrueBlock() {
    return this.getChildSet('trueblock')
  }

  // getElseBlock() {
  //   return this.getChildSet('elseblock');
  // }

  clean() {
    this.getTrueBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getTrueBlock().removeChild(index)
        }
      }
    })
    // this.getElseBlock().children.forEach((child: SplootNode, index: number) => {
    //   if (child.type === SPLOOT_EXPRESSION) {
    //     if ((child as SplootExpression).getTokenSet().getCount() === 0) {
    //       this.getElseBlock().removeChild(index);
    //     }
    //   }
    // });
  }

  generateJsAst(): ASTNode {
    const test = (this.getCondition().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    const statements = []
    this.getTrueBlock().children.forEach((node: JavaScriptSplootNode) => {
      let ast = node.generateJsAst()
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind)
      }
      statements.push(ast)
    })
    const consequent = recast.types.builders.blockStatement(statements)
    return recast.types.builders.ifStatement(test, consequent)
  }

  static deserializer(serializedNode: SerializedNode): IfStatement {
    const node = new IfStatement(null)
    node.getCondition().removeChild(0)
    node.deserializeChildSet('condition', serializedNode)
    node.deserializeChildSet('trueblock', serializedNode)
    //node.deserializeChildSet('elseblock', serializedNode);
    return node
  }

  static register() {
    const ifType = new TypeRegistration()
    ifType.typeName = IF_STATEMENT
    ifType.deserializer = IfStatement.deserializer
    ifType.childSets = {
      condition: NodeCategory.Expression,
      trueblock: NodeCategory.Statement,
      //  'elseblock': NodeCategory.Statement
    }
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'trueblock'),
    ])
    ifType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(ifType)
    registerNodeCateogry(IF_STATEMENT, NodeCategory.Statement)
    registerAutocompleter(NodeCategory.Statement, new Generator())
  }
}
