import { ParseMapper } from '../../analyzer/python_analyzer'
import { ParseNode } from 'sploot-checker'
import { SplootNode } from '../../node'

export class PythonNode extends SplootNode {
  generateParseTree(parseMapper: ParseMapper): ParseNode {
    console.warn('Generate Parse tree not implemented for node type: ', this.type)
    return null
  }
}
