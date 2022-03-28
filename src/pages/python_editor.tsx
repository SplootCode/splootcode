import './python_editor.css'

import React, { useEffect, useState } from 'react'
import { Editor } from '@splootcode/editor/components/editor'
import { EditorState, EditorStateContext } from '@splootcode/editor/context/editor_context'
import { NodeBlock } from '@splootcode/editor/layout/rendered_node'
import { Project } from '@splootcode/core/language/projects/project'
import { SplootFile } from '@splootcode/core/language/projects/file'
import { SplootPackage } from '@splootcode/core/language/projects/package'

interface WebEditorProps {
  project: Project
}

export const PythonEditorPanels = (props: WebEditorProps) => {
  const { project } = props
  const onlyPackage: SplootPackage = project.packages[0]

  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    const pack = project.getDefaultPackage()
    const file = pack.getDefaultFile()
    const selectFile = (pack: SplootPackage, file: SplootFile) => {
      const editorState = new EditorState()
      const newRootNode = new NodeBlock(null, file.rootNode, editorState.selection, 0)
      editorState.selection.setRootNode(newRootNode)
      editorState.setRootNode(newRootNode)
      setSelectedFile(editorState)
    }
    pack.getLoadedFile(file.name).then(() => {
      selectFile(pack, file)
    })
  }, [project])

  return (
    <React.Fragment>
      <EditorStateContext.Provider value={selectedFile}>
        {selectedFile ? (
          <Editor block={selectedFile.rootNode} pkg={onlyPackage} selection={selectedFile.selection} width={300} />
        ) : null}
      </EditorStateContext.Provider>
    </React.Fragment>
  )
}
