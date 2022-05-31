import { ParseNode } from 'sploot-checker'

import { ParseMapper } from '../../analyzer/python_analyzer'
import { SplootNode } from '../../node'

export abstract class PythonNode extends SplootNode {
  generateParseTree(parseMapper: ParseMapper): ParseNode {
    console.warn('generateParseTree not implemented for type', this.type)
    return null
  }

  // abstract generateParseTree(parseMapper: ParseMapper): ParseNode
}
