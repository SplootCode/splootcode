import * as recast from 'recast'

import { ASTNode } from 'ast-types'
import { SplootNode } from '../core/language/node'

export class JavaScriptSplootNode extends SplootNode {
  generateJsAst(): ASTNode {
    console.warn('Missing generateJsAst implementation for: ', this.type)
    return null
  }

  generateCodeString(): string {
    const ast = this.generateJsAst()
    return recast.print(ast).code
  }
}
