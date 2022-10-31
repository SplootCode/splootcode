import './python_editor.css'

import React, { useEffect, useState } from 'react'
import { Editor } from '@splootcode/editor/components/editor'
import { EditorBanner } from '@splootcode/editor/components/editor_banner'
import { EditorHostingConfig } from '@splootcode/editor/editor_hosting_config'
import { EditorState, EditorStateContext } from '@splootcode/editor/context/editor_context'
import { Project } from '@splootcode/core'
import { SplootPackage } from '@splootcode/core'

const hostingConfig: EditorHostingConfig = {
  TYPESHED_PATH: import.meta.env.SPLOOT_TYPESHED_PATH,
  FRAME_VIEW_SCHEME: import.meta.env.SPLOOT_FRAME_VIEW_SCHEME,
  FRAME_VIEW_DOMAIN: import.meta.env.SPLOOT_FRAME_VIEW_DOMAIN,
}

interface PythonEditorProps {
  project: Project
  onSaveAs: () => void
}

export const PythonEditorPanels = (props: PythonEditorProps) => {
  const { project, onSaveAs } = props
  const onlyPackage: SplootPackage = project.packages[0]

  const [editorState, setEditorState] = useState<EditorState>(null)

  useEffect(() => {
    const editorState = new EditorState(project, hostingConfig)
    editorState.loadDefaultFile().then(() => {
      setEditorState(editorState)
    })

    return () => {
      editorState.cleanup()
    }
  }, [project])

  return (
    <React.Fragment>
      <EditorStateContext.Provider value={editorState}>
        {editorState ? (
          <Editor
            block={editorState.rootNode}
            pkg={onlyPackage}
            selection={editorState.selection}
            validationWatcher={editorState.validationWatcher}
            banner={project.isReadOnly ? <EditorBanner project={project} onSaveAs={onSaveAs} /> : null}
            editorHostingConfig={editorState.hostingConfig}
          />
        ) : null}
      </EditorStateContext.Provider>
    </React.Fragment>
  )
}
