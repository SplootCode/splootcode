import "./tray.css"

import { observer } from "mobx-react"
import React from "react"
import { render } from "react-dom"

import { NodeSelectionState } from "../../context/selection"
import { CallVariable } from "../../language/types/js/call_variable"
import { NumericLiteral, StringLiteral } from "../../language/types/literals"
import { PythonAssignment } from "../../language/types/python/python_assignment"
import { PythonBinaryOperator } from "../../language/types/python/python_binary_operator"
import { PythonCallVariable } from "../../language/types/python/python_call_variable"
import { PythonVariableReference } from "../../language/types/python/variable_reference"
import { NodeBlock } from "../../layout/rendered_node"
import { SPLOOT_MIME_TYPE } from "./editor"
import { EditorNodeBlock } from "./node_block"

interface TrayProps {
  width: number;
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any;
}

interface TrayState {
  selectedNode?: number,
  trayNodes: NodeBlock[],
  draggingNode: NodeBlock,
  draggingX: number,
  draggyingY: number,
}

function getTrayNodeSuggestions() : NodeBlock[] {
  let nodes = [
    new PythonCallVariable(null, 'print', 1),
    new PythonAssignment(null),
    new PythonVariableReference(null, 'my_variable'),
    new NumericLiteral(null, 123),
    new PythonBinaryOperator(null, '+'),
    new PythonBinaryOperator(null, '*'),
    new StringLiteral(null, ''),
    new StringLiteral(null, 'Hi there!'),
  ];
  let renderedNodes = [];
  let topPos = 10;
  for (let node of nodes) {
    console.log(node);
    let nodeBlock = new NodeBlock(null, node, null, 0, false);
    nodeBlock.calculateDimensions(16, topPos, null);
    topPos += nodeBlock.rowHeight + 10;
    renderedNodes.push(nodeBlock);
  }
  return renderedNodes;
}

@observer
export class Tray extends React.Component<TrayProps, TrayState> {
  constructor(props) {
    super(props);
    this.state = {
      selectedNode: null,
      trayNodes: getTrayNodeSuggestions(),
      draggingNode: null,
      draggingX: 0,
      draggyingY: 0,
    };
  }
  
  render() {
    let height = 500;
    let { selectedNode, trayNodes } = this.state
    return (
      <div>
        <div className="tray" draggable={true} onDragStart={this.onDragStart}>
          <svg xmlns="http://www.w3.org/2000/svg" height={height} width={200} preserveAspectRatio="none">
            {
              trayNodes.map((nodeBlock, i) => {
                let selectionState = (i == selectedNode) ? NodeSelectionState.SELECTED : NodeSelectionState.UNSELECTED
                return (
                  <EditorNodeBlock
                      block={nodeBlock}
                      onClickHandler={()=>{this.selectNode(i)}}
                      selection={null} selectionState={selectionState}/>
                );
              })
            }
          </svg>
        </div>
      </div>
    );
  }

  onDragStart = (event: React.DragEvent) => {
    let x = event.pageX;
    let y = event.pageY;
    let node = null as NodeBlock;
    for (let nodeBlock of this.state.trayNodes) {
      if (y > nodeBlock.y && y < nodeBlock.y + nodeBlock.rowHeight) {
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

  selectNode = (index) => {
    this.setState({selectedNode: index});
  }
}
