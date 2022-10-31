import * as recast from 'recast'

import { ASTNode } from 'ast-types'
import { ChildSetType } from '@splootcode/core'
import { ExpressionKind, StatementKind } from 'ast-types/gen/kinds'
import { HighlightColorCategory } from '@splootcode/core'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core'
import { ParentReference, SplootNode } from '@splootcode/core'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const JAVASCRIPT_FILE = 'JAVASCRIPT_FILE'

export class JavascriptFile extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JAVASCRIPT_FILE)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement)
  }

  getBody() {
    return this.getChildSet('body')
  }

  generateJsAst(): ASTNode {
    const statements = []
    this.getBody().children.forEach((node: JavaScriptSplootNode) => {
      let result = null
      if (node.type === SPLOOT_EXPRESSION) {
        const expressionNode = node.generateJsAst() as ExpressionKind
        if (expressionNode !== null) {
          result = recast.types.builders.expressionStatement(expressionNode)
        }
      } else {
        result = node.generateJsAst() as StatementKind
      }
      if (result !== null) {
        statements.push(result)
      }
    })
    return recast.types.builders.program(statements)
  }

  generateCodeString(): string {
    return recast.print(this.generateJsAst()).code
  }

  clean() {
    this.getBody().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getBody().removeChild(index)
        }
      }
    })
  }

  static deserializer(serializedNode: SerializedNode): JavascriptFile {
    const jsFile = new JavascriptFile(null)
    jsFile.deserializeChildSet('body', serializedNode)
    return jsFile
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = JAVASCRIPT_FILE
    typeRegistration.deserializer = JavascriptFile.deserializer
    typeRegistration.properties = []
    typeRegistration.hasScope = true
    typeRegistration.childSets = { body: NodeCategory.Statement }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(JAVASCRIPT_FILE, NodeCategory.JavascriptFile)
  }
}
