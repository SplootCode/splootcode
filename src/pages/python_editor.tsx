import React from 'react'
import { Editor } from '@splootcode/editor/components/editor';
import { PythonFrame } from '../components/python/python_frame';
import { EditorState, EditorStateContext } from '@splootcode/editor/context/editor_context';
import { SplootPackage } from '@splootcode/core/language/projects/package';
import { Project } from '@splootcode/core/language/projects/project';


interface WebEditorProps {
  project: Project;
  selectedFile: EditorState;
}

export class PythonEditorPanels extends React.Component<WebEditorProps> {

  render() {
    const { project, selectedFile } = this.props;
    let onlyPackage : SplootPackage = project.packages[0];

    return (
      <React.Fragment>
        <div className="python-editor-column">
          <EditorStateContext.Provider value={selectedFile}>
            { selectedFile ? 
              <Editor block={selectedFile.rootNode} selection={selectedFile.selection} width={300} />
              : null
            }
          </EditorStateContext.Provider>
        </div>
        <div className="python-editor-preview-panel">
          <PythonFrame pkg={onlyPackage}/>
        </div>
      </React.Fragment>
    );
  }
}