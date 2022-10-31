import { NodeCategory, getNodesForCategory } from '@splootcode/core'
import { SplootNode } from '@splootcode/core'
import { deepEquals, nodeSanityCheck } from './test_utils'
import { deserializeNode } from '@splootcode/core'
import { getEmptyStatementNodes, getExpressionTokenNodes } from './single_examples'
import { loadPythonTypes } from '../../type_loader'

describe('python node serialization', () => {
  beforeAll(() => {
    loadPythonTypes()
  })

  test('statement nodes serialization roundtrips accurately', () => {
    const examples: SplootNode[] = getEmptyStatementNodes()
    examples.forEach((node) => {
      nodeSanityCheck(node)
      const cloneNode = deserializeNode(node.serialize())
      deepEquals(node, cloneNode)
    })
  })

  test('all statement types accounted for', () => {
    const examples: SplootNode[] = getEmptyStatementNodes()
    const testedTypes = new Set()
    examples.forEach((exampleNode) => {
      testedTypes.add(exampleNode.type)
    })

    const statementTypes = getNodesForCategory(NodeCategory.PythonStatementContents)
    statementTypes.forEach((statementNodeType) => {
      if (!testedTypes.has(statementNodeType)) {
        throw new Error(`Node type ${statementNodeType} was not tested for serialization roundtripping.`)
      }
    })
  })

  test('expression token node serialization roundtrips accurately', () => {
    const examples: SplootNode[] = getExpressionTokenNodes()
    examples.forEach((node) => {
      nodeSanityCheck(node)
      const cloneNode = deserializeNode(node.serialize())
      deepEquals(node, cloneNode)
    })
  })

  test('all expression token types accounted for', () => {
    const examples: SplootNode[] = getExpressionTokenNodes()
    const testedTypes = new Set()
    examples.forEach((exampleNode) => {
      testedTypes.add(exampleNode.type)
    })

    const tokenTypes = getNodesForCategory(NodeCategory.PythonExpressionToken)
    tokenTypes.forEach((nodeType) => {
      if (!testedTypes.has(nodeType)) {
        throw new Error(`Node type ${nodeType} was not tested for serialization roundtripping.`)
      }
    })
  })
})
