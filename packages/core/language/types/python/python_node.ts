import { ParseNode } from 'sploot-checker'

import { ParseMapper } from '../../analyzer/python_analyzer'
import { SplootNode } from '../../node'

export abstract class PythonNode extends SplootNode {
  abstract generateParseTree(parseMapper: ParseMapper): ParseNode
}
