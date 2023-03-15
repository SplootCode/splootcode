import './python_editor.css'

import React, { useState } from 'react'
import { Allotment, LayoutPriority } from 'allotment'
import {
  Editor,
  EditorBanner,
  EditorSideMenu,
  EditorSideMenuPane,
  EditorSideMenuView,
  EditorState,
  PythonRuntimePanel,
} from '@splootcode/editor'
import { RunType, SplootPackage } from '@splootcode/core'

interface PythonEditorProps {
  editorState: EditorState
  onSaveAs: () => void
}

export const PythonEditorPanels = (props: PythonEditorProps) => {
  const { editorState, onSaveAs } = props
  const [visibleView, setVisibleView] = useState('test-requests' as EditorSideMenuView)
  const onlyPackage: SplootPackage = editorState.project.packages[0]
  const startSize = window.outerWidth - 270 - 360

  const editorHostingConfig = editorState.hostingConfig
  const validationWatcher = editorState.validationWatcher
  const enableTestRequests = editorState.project.runSettings.runType === RunType.HTTP_REQUEST

  return (
    <div className="editor">
      <EditorSideMenu
        currentView={visibleView}
        onChangeView={(newView: EditorSideMenuView) => setVisibleView(newView)}
        enableTestRequests={enableTestRequests}
      />
      <Allotment defaultSizes={[300, startSize, 360]} minSize={180} proportionalLayout={false}>
        <Allotment.Pane visible={visibleView !== ''} snap>
          <EditorSideMenuPane visibleView={visibleView} editorState={editorState} />
        </Allotment.Pane>
        <Allotment.Pane priority={LayoutPriority.High}>
          <Editor
            block={editorState.rootNode}
            project={editorState.project}
            pkg={onlyPackage}
            selection={editorState.selection}
            validationWatcher={editorState.validationWatcher}
            banner={
              editorState.project.isReadOnly ? <EditorBanner project={editorState.project} onSaveAs={onSaveAs} /> : null
            }
            editorHostingConfig={editorState.hostingConfig}
            undoWatcher={editorState.undoWatcher}
          />
        </Allotment.Pane>
        <Allotment.Pane preferredSize={360} priority={LayoutPriority.Low}>
          <div className="python-preview-panel">
            <PythonRuntimePanel
              project={editorState.project}
              pkg={onlyPackage}
              validationWatcher={validationWatcher}
              frameScheme={editorHostingConfig.FRAME_VIEW_SCHEME}
              frameDomain={editorHostingConfig.FRAME_VIEW_DOMAIN}
            />
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  )
}
