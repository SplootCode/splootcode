import './tray.css'

import React from 'react'
import { observer } from 'mobx-react'

import { Assignment } from '@splootcode/core/language/types/js/assignment'
import { BinaryOperator } from '@splootcode/core/language/types/js/binary_operator'
import { CallMember } from '@splootcode/core/language/types/js/call_member'
import { EditorNodeBlock } from './node_block'
import { FunctionDeclaration } from '@splootcode/core/language/types/js/functions'
import { HTML_DOCUMENT } from '@splootcode/core/language/types/html/html_document'
import { IfStatement } from '@splootcode/core/language/types/js/if'
import { ImportDefaultStatement } from '@splootcode/core/language/types/js/import_default'
import { ImportStatement } from '@splootcode/core/language/types/js/import'
import { JAVASCRIPT_FILE } from '@splootcode/core/language/types/js/javascript_file'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'
import { NumericLiteral, StringLiteral } from '@splootcode/core/language/types/literals'
import { PYTHON_FILE } from '@splootcode/core/language/types/python/python_file'
import { PythonAssignment } from '@splootcode/core/language/types/python/python_assignment'
import { PythonBinaryOperator } from '@splootcode/core/language/types/python/python_binary_operator'
import { PythonBool } from '@splootcode/core/language/types/python/literals'
import { PythonCallVariable } from '@splootcode/core/language/types/python/python_call_variable'
import { PythonForLoop } from '@splootcode/core/language/types/python/python_for'
import { PythonIfStatement } from '@splootcode/core/language/types/python/python_if'
import { PythonWhileLoop } from '@splootcode/core/language/types/python/python_while'
import { ReturnStatement } from '@splootcode/core/language/types/js/return'
import { SplootExpression } from '@splootcode/core/language/types/js/expression'
import { SplootHtmlElement } from '@splootcode/core/language/types/html/html_element'
import { SplootHtmlScriptElement } from '@splootcode/core/language/types/html/html_script_element'
import { SplootHtmlStyleElement } from '@splootcode/core/language/types/html/html_style_element'
import { SplootNode } from '@splootcode/core/language/node'
import { VariableDeclaration } from '@splootcode/core/language/types/js/variable_declaration'
import { VariableReference } from '@splootcode/core/language/types/js/variable_reference'

interface TrayProps {
  rootNode: SplootNode
  width: number
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}

interface TrayState {
  trayNodes: NodeBlock[]
  height: number
}

function getTrayNodeSuggestions(rootNode: SplootNode): [NodeBlock[], number] {
  let nodes = []
  if (rootNode.type === PYTHON_FILE) {
    nodes = [
      new PythonCallVariable(null, 'print', 1),
      new PythonCallVariable(null, 'input', 1),
      new PythonAssignment(null),
      new StringLiteral(null, ''),
      new StringLiteral(null, 'Hi there!'),
      new NumericLiteral(null, 123),
      new PythonBool(null, true),
      new PythonBool(null, false),
      new PythonBinaryOperator(null, '+'),
      new PythonBinaryOperator(null, '-'),
      new PythonBinaryOperator(null, '*'),
      new PythonBinaryOperator(null, '/'),
      new PythonBinaryOperator(null, '%'),
      new PythonBinaryOperator(null, '//'),
      new PythonIfStatement(null),
      new PythonWhileLoop(null),
      new PythonForLoop(null),
      new PythonBinaryOperator(null, '=='),
      new PythonBinaryOperator(null, '!='),
      new PythonBinaryOperator(null, '<'),
      new PythonBinaryOperator(null, '<='),
      new PythonBinaryOperator(null, '>'),
      new PythonBinaryOperator(null, '<='),
      new PythonBinaryOperator(null, 'in'),
      new PythonBinaryOperator(null, 'not in'),
      new PythonBinaryOperator(null, 'and'),
      new PythonBinaryOperator(null, 'or'),
      new PythonBinaryOperator(null, 'not'),
      new PythonCallVariable(null, 'int', 1),
      new PythonCallVariable(null, 'str', 1),
      new PythonCallVariable(null, 'float', 1),
      new PythonCallVariable(null, 'len', 1),
      new PythonCallVariable(null, 'list', 1),
    ]
  } else if (rootNode.type === HTML_DOCUMENT) {
    nodes = [
      new StringLiteral(null, ''),
      new StringLiteral(null, 'Hi there!'),
      new SplootHtmlStyleElement(null),
      new SplootHtmlElement(null, 'p'),
      new SplootHtmlElement(null, 'h1'),
      new SplootHtmlElement(null, 'h2'),
      new SplootHtmlElement(null, 'h3'),
      new SplootHtmlElement(null, 'h4'),
      new SplootHtmlElement(null, 'div'),
      new SplootHtmlElement(null, 'img'),
      new SplootHtmlElement(null, 'strong'),
      new SplootHtmlElement(null, 'em'),
      new SplootHtmlScriptElement(null),
    ]
  } else if (rootNode.type === JAVASCRIPT_FILE) {
    const console = new CallMember(null)
    console.getObjectExpressionToken().addChild(new VariableReference(null, 'console'))
    console.setMember('log')
    console.getArguments().addChild(new SplootExpression(null))

    nodes = [
      new ImportStatement(null),
      new ImportDefaultStatement(null),
      new VariableReference(null, 'window'),
      new VariableReference(null, 'document'),
      console,
      new VariableDeclaration(null),
      new Assignment(null),
      new FunctionDeclaration(null),
      new ReturnStatement(null),
      new IfStatement(null),
      new StringLiteral(null, ''),
      new StringLiteral(null, 'Hi there!'),
      new NumericLiteral(null, 123),
      new BinaryOperator(null, '+'),
      new BinaryOperator(null, '-'),
      new BinaryOperator(null, '*'),
      new BinaryOperator(null, '/'),
      new BinaryOperator(null, '%'),
    ]
  }

  const renderedNodes = []
  let topPos = 10
  for (const node of nodes) {
    const nodeBlock = new NodeBlock(null, node, null, 0)
    nodeBlock.calculateDimensions(16, topPos, null)
    topPos += nodeBlock.rowHeight + nodeBlock.indentedBlockHeight + 10
    renderedNodes.push(nodeBlock)
  }
  return [renderedNodes, topPos]
}

@observer
export class Tray extends React.Component<TrayProps, TrayState> {
  private scrollableTrayRef: React.RefObject<SVGSVGElement>

  constructor(props) {
    super(props)
    this.scrollableTrayRef = React.createRef()
    const [trayNodes, height] = getTrayNodeSuggestions(this.props.rootNode)
    this.state = {
      trayNodes: trayNodes,
      height: height,
    }
  }

  render() {
    const { trayNodes, height } = this.state
    return (
      <div>
        <div className="tray" draggable={true} onDragStart={this.onDragStart}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height={height}
            width={200}
            preserveAspectRatio="none"
            ref={this.scrollableTrayRef}
          >
            {trayNodes.map((nodeBlock, i) => {
              const selectionState = NodeSelectionState.UNSELECTED
              return <EditorNodeBlock key={i} block={nodeBlock} selection={null} selectionState={selectionState} />
            })}
          </svg>
        </div>
      </div>
    )
  }

  onDragStart = (event: React.DragEvent) => {
    const refBox = this.scrollableTrayRef.current.getBoundingClientRect()
    // let x = event.pageX - refBox.left;
    const y = event.pageY - refBox.top
    let node = null as NodeBlock
    for (const nodeBlock of this.state.trayNodes) {
      if (y > nodeBlock.y && y < nodeBlock.y + nodeBlock.rowHeight + nodeBlock.indentedBlockHeight) {
        node = nodeBlock
        break
      }
    }
    if (node !== null) {
      this.props.startDrag(node, 0, 0)
    }
    event.preventDefault()
    event.stopPropagation()
  }
}
