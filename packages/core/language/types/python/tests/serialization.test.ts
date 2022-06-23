import { NodeCategory, getNodesForCategory } from '../../../node_category_registry'
import { SplootNode } from '../../../node'
import { deepEquals, nodeSanityCheck } from './test_utils'
import { deserializeNode } from '../../../type_registry'
import { getEmptyStatementNodes, getExpressionTokenNodes } from './single_examples'
import { loadTypes } from '../../../type_loader'

describe('python node serialization', () => {
  beforeAll(() => {
    loadTypes()
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
        console.log(testedTypes)
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
        console.log(testedTypes)
        throw new Error(`Node type ${nodeType} was not tested for serialization roundtripping.`)
      }
    })
  })
})
