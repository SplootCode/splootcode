import { ParseNode } from 'structured-pyright'

import { ParseMapper } from '../../analyzer/python_analyzer'
import { SplootNode } from '../../node'

export abstract class PythonNode extends SplootNode {
  abstract generateParseTree(parseMapper: ParseMapper): ParseNode
}
