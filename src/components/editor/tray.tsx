import "./tray.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelectionState } from "../../context/selection"
import { NumericLiteral, StringLiteral } from "../../language/types/literals"
import { PythonAssignment } from "../../language/types/python/python_assignment"
import { PythonBinaryOperator } from "../../language/types/python/python_binary_operator"
import { PythonCallVariable } from "../../language/types/python/python_call_variable"
import { PythonVariableReference } from "../../language/types/python/variable_reference"
import { NodeBlock } from "../../layout/rendered_node"
import { EditorNodeBlock } from "./node_block"
import { SplootNode } from "../../language/node"
import { PYTHON_FILE } from "../../language/types/python/python_file"
import { HTML_DOCUMENT } from "../../language/types/html/html_document"
import { SplootHtmlElement } from "../../language/types/html/html_element"
import { SplootHtmlScriptElement } from "../../language/types/html/html_script_element"
import { SplootHtmlStyleElement } from "../../language/types/html/html_style_element"
import { JAVASCRIPT_FILE } from "../../language/types/js/javascript_file"
import { CallMember } from "../../language/types/js/call_member"
import { VariableReference } from "../../language/types/js/variable_reference"
import { SplootExpression } from "../../language/types/js/expression"
import { VariableDeclaration } from "../../language/types/js/variable_declaration"
import { BinaryOperator } from "../../language/types/js/binary_operator"
import { Assignment } from "../../language/types/js/assignment"
import { FunctionDeclaration } from "../../language/types/js/functions"
import { IfStatement } from "../../language/types/js/if"
import { ReturnStatement } from "../../language/types/js/return"
import { ImportStatement } from "../../language/types/js/import"
import { ImportDefaultStatement } from "../../language/types/js/import_default"
import { PythonIfStatement } from "../../language/types/python/python_if"

interface TrayProps {
  rootNode: SplootNode,
  width: number;
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any;
}

interface TrayState {
  trayNodes: NodeBlock[],
  height: number,
}

function getTrayNodeSuggestions(rootNode: SplootNode) : [NodeBlock[], number] {
  let nodes = []
  if (rootNode.type === PYTHON_FILE) {
    nodes = [
      new PythonCallVariable(null, 'print', 1),
      new PythonAssignment(null),
      new PythonVariableReference(null, 'my_variable'),
      new StringLiteral(null, ''),
      new StringLiteral(null, 'Hi there!'),
      new NumericLiteral(null, 123),
      new PythonBinaryOperator(null, '+'),
      new PythonBinaryOperator(null, '-'),
      new PythonBinaryOperator(null, '*'),
      new PythonBinaryOperator(null, '/'),
      new PythonBinaryOperator(null, '%'),
      new PythonBinaryOperator(null, '//'),
      new PythonIfStatement(null),
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
    ];
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
    let console = new CallMember(null);
    console.getObjectExpressionToken().addChild(new VariableReference(null, 'console'))
    console.setMember('log');
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

  let renderedNodes = [];
  let topPos = 10;
  for (let node of nodes) {
    let nodeBlock = new NodeBlock(null, node, null, 0, false);
    nodeBlock.calculateDimensions(16, topPos, null);
    topPos += nodeBlock.rowHeight + nodeBlock.indentedBlockHeight + 10;
    renderedNodes.push(nodeBlock);
  }
  return [renderedNodes, topPos];
}

@observer
export class Tray extends React.Component<TrayProps, TrayState> {
  private scrollableTrayRef : React.RefObject<SVGSVGElement>;

  constructor(props) {
    super(props);
    this.scrollableTrayRef = React.createRef();
    let [trayNodes, height] = getTrayNodeSuggestions(this.props.rootNode);
    this.state = {
      trayNodes: trayNodes,
      height: height,
    }
  }
  
  render() {
    let {trayNodes, height} = this.state;
    return (
      <div>
        <div className="tray" draggable={true} onDragStart={this.onDragStart} >
          <svg xmlns="http://www.w3.org/2000/svg" height={height} width={200} preserveAspectRatio="none" ref={this.scrollableTrayRef}>
            {
              trayNodes.map((nodeBlock, i) => {
                let selectionState = NodeSelectionState.UNSELECTED
                return (
                  <EditorNodeBlock
                      block={nodeBlock}
                      selection={null}
                      selectionState={selectionState}
                  />
                );
              })
            }
          </svg>
        </div>
      </div>
    );
  }

  onDragStart = (event: React.DragEvent) => {
    let refBox = this.scrollableTrayRef.current.getBoundingClientRect();
    // let x = event.pageX - refBox.left;
    let y = event.pageY - refBox.top;
    let node = null as NodeBlock;
    for (let nodeBlock of this.state.trayNodes) {
      if (y > nodeBlock.y && y < nodeBlock.y + nodeBlock.rowHeight + nodeBlock.indentedBlockHeight) {
        node = nodeBlock;
        break;
      }
    }
    if (node !== null) {
      this.props.startDrag(node, 0, 0);
    }
    event.preventDefault();
    event.stopPropagation();
  }
}
