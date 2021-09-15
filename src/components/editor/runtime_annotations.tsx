import React from "react"

import { observer } from "mobx-react";
import { NodeBlock } from "../../layout/rendered_node";

import "./runtime_annotations.css";
import { stringWidth } from "../../layout/rendered_childset_block";

interface LoopAnnotationProps {
    nodeBlock: NodeBlock;
}

@observer
export class LoopAnnotation extends React.Component<LoopAnnotationProps> {
  private sliderRef : React.RefObject<SVGGElement>;

  constructor(props: LoopAnnotationProps) {
    super(props);
    this.sliderRef = React.createRef();
  }

  render() {
    const block = this.props.nodeBlock;
    const frames = block.runtimeIterations;
    
    // Loops always have frames, even if it's just to evaluate the condition, and the body is never run.
    if (frames > 0) {
      const frameArray = Array.from(Array(frames).keys())
      const label = `Ran ${frames-1} times`;
      const dotX = block.x + 6 + stringWidth(label);
      const selected = (block.runtimeCaptureFrame > frames - 1 || block.runtimeCaptureFrame === -1)? frames - 1 : block.runtimeCaptureFrame;
      const width = Math.min((frames - 1) * 10, 200);
      const location = selected/(frames - 1) * width;
      const numLabel = `${(selected == frames - 1) ? 'end' : selected + 1}`
      const numLabelWidth = Math.max(stringWidth('end'), stringWidth(`${frames}`)) + 24;
      return (
        <g>
          <text x={block.x + 2} y={block.y + 8} className="annotation" xmlSpace="preserve">{ label }</text>
          <g transform={`translate(${dotX} ${block.y + 2})`} onClick={this.clickHandler} ref={this.sliderRef}>
            <rect className="slider-background" x={-8} y={-6} width={width + 16} height={14}/>
            <rect className="slider-track" width={width} height="3"/>
            <rect className="slider-fill" width={location} height="3"/>
            <circle className="slider-handle" cx={location} cy={1} r={6}/>
          </g>
          <g transform={`translate(${dotX} ${block.y + 2})`}>
            <text className="annotation" x={width + 18 + numLabelWidth/2} y={6} text-anchor="middle" xmlSpace="preserve">{ numLabel }</text>
            <rect className="slider-button" rx="2" x={width + 10} y={-6} width={15} height={16} onClick={this.decrement}/>
            <text className="slider-button-label" x={width + 14} y={7}>&lt;</text>
            <rect className="slider-button" rx="2" x={width + 10 + numLabelWidth} y={-6} width={15} height={16} onClick={this.increment}/>
            <text className="slider-button-label" x={width + 14 + numLabelWidth} y={7}>&gt;</text>
          </g>
        </g>
      );
    }
    return null;
  }

  clickHandler = (event: React.MouseEvent) => {
    event.stopPropagation();
    var dim = this.sliderRef.current.getBoundingClientRect();
    var x = event.clientX - dim.left - 8;
    
    const block = this.props.nodeBlock;
    const frames = block.runtimeIterations;
    const width = Math.min((frames - 1) * 10, 200);
    x = Math.min(width, Math.max(x, 0))
    const idx = Math.floor(x / width * frames);
    this.props.nodeBlock.selectRuntimeCaptureFrame(idx);
  }

  increment = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.nativeEvent.cancelBubble = true;
    const current = this.props.nodeBlock.runtimeCaptureFrame;
    if (current == -1) {
      return;
    }
    const idx = Math.min(current + 1, this.props.nodeBlock.runtimeIterations - 1);
    this.props.nodeBlock.selectRuntimeCaptureFrame(idx);
  }

  decrement = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.nativeEvent.cancelBubble = true;
    let current = this.props.nodeBlock.runtimeCaptureFrame;
    if (current == -1) {
      current = this.props.nodeBlock.runtimeIterations - 1;
    }
    const idx = Math.max(current - 1, 0); 
    this.props.nodeBlock.selectRuntimeCaptureFrame(idx);
  }
}

interface RuntimeAnnotationProps {
  nodeBlock: NodeBlock
}

@observer
export class RuntimeAnnotation extends React.Component<RuntimeAnnotationProps> {
  render() {
    const block = this.props.nodeBlock;
    const annotations = block.runtimeAnnotation;
    if (annotations.length != 0) {
      const x = block.x + block.rowWidth + 8;
      let y = block.y + block.marginTop + 20 - (annotations.length - 1) * 8;
      return (
        <g>
          {
            annotations.map(annotation => {
              const entry = <text x={x} y={y} className="annotation" xmlSpace="preserve">{annotation}</text>
              y += 16;
              return entry;
            })
          }
        </g>
      )
    }
    return null;
  }
}