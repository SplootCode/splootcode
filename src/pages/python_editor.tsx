import './python_editor.css'

import React, { useEffect, useState } from 'react'
import { Editor } from '@splootcode/editor/components/editor'
import { EditorState, EditorStateContext } from '@splootcode/editor/context/editor_context'
import { Project } from '@splootcode/core/language/projects/project'
import { SplootPackage } from '@splootcode/core/language/projects/package'

interface WebEditorProps {
  project: Project
}

export const PythonEditorPanels = (props: WebEditorProps) => {
  const { project } = props
  const onlyPackage: SplootPackage = project.packages[0]

  const [editorState, setEditorState] = useState(null)

  useEffect(() => {
    const editorState = new EditorState(project)
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
          />
        ) : null}
      </EditorStateContext.Provider>
    </React.Fragment>
  )
}
