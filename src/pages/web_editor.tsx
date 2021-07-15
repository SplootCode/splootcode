import React from 'react'
import { DataSheetEditor } from '../components/datasheet/datasheet';
import { Editor } from '../components/editor/editor';
import { ViewPage } from '../components/preview/frame_view';
import { DataSheetState, EditorState, EditorStateContext } from '../context/editor_context';
import { SplootPackage } from '../language/projects/package';
import { Project } from '../language/projects/project';


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
        <div className={'web-editor-preview-panel'} >
        <ViewPage pkg={onlyPackage}/>
        </div>
        <div className="web-editor-column">
          {
            ((selectedFile || selectedDatasheet)) ?
                (
                  (isNodeEditor) ?
                  <EditorStateContext.Provider value={selectedFile}>
                  <div className={'editor-panel selected'}>
                    <Editor block={selectedFile.rootNode} selection={selectedFile.selection} width={300} />
                  </div>
                  </EditorStateContext.Provider>
                  :
                  <DataSheetEditor dataSheetState={selectedDatasheet}/>
                )
            : null
          }
        </div>
      </React.Fragment>
    );
  }
}