import React from 'react'
import { DataSheetEditor } from '@splootcode/editor/components/datasheet/datasheet';
import { Editor } from '@splootcode/editor/components/editor';
import { ViewPage } from '@splootcode/editor/runtime/web_runtime';
import { DataSheetState, EditorState, EditorStateContext } from '@splootcode/editor/context/editor_context';
import { SplootPackage } from '@splootcode/core/language/projects/package';
import { Project } from '@splootcode/core/language/projects/project';


interface WebEditorProps {
  project: Project;
  selectedFile: EditorState;
  isNodeEditor: boolean;
  selectedDatasheet: DataSheetState;
}

export class WebEditorPanels extends React.Component<WebEditorProps> {

  render() {
    const { project, selectedFile, selectedDatasheet, isNodeEditor } = this.props;
    let onlyPackage : SplootPackage = project.packages[0];

    return (
      <React.Fragment>
        <div className="web-editor-column">
          {
            ((selectedFile || selectedDatasheet)) ?
                (
                  (isNodeEditor) ?
                  <EditorStateContext.Provider value={selectedFile}>
                    <Editor block={selectedFile.rootNode} selection={selectedFile.selection} width={300} />
                  </EditorStateContext.Provider>
                  :
                  <DataSheetEditor dataSheetState={selectedDatasheet}/>
                )
            : null
          }
        </div>
        <div className={'web-editor-preview-panel'} >
          <ViewPage pkg={onlyPackage}/>
        </div>
      </React.Fragment>
    );
  }
}