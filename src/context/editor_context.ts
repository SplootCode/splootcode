import React from 'react';
import { NodeSelection } from './selection';
import { NodeBlock } from '../layout/rendered_node';
import { observable, action } from 'mobx';

export class EditorState {
  @observable
  rootNode: NodeBlock;
  selection: NodeSelection;

  constructor() {
    this.rootNode = null;
    this.selection = new NodeSelection();
  }

  @action
  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode;
    this.selection.setRootNode(rootNode);
  }
}

export const EditorStateContext = React.createContext(null);
