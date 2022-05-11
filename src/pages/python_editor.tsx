import './python_editor.css'

import React, { useEffect, useState } from 'react'
import { Editor } from '@splootcode/editor/components/editor'
import { EditorState, EditorStateContext } from '@splootcode/editor/context/editor_context'
import { NodeBlock } from '@splootcode/editor/layout/rendered_node'
import { Project } from '@splootcode/core/language/projects/project'
import { SplootFile } from '@splootcode/core/language/projects/file'
import { SplootPackage } from '@splootcode/core/language/projects/package'
import { generateScope } from '@splootcode/core/language/scope/scope'

interface WebEditorProps {
  project: Project
}

export const PythonEditorPanels = (props: WebEditorProps) => {
  const { project } = props
  const onlyPackage: SplootPackage = project.packages[0]

  const [editorState, setEditorState] = useState(null)

  useEffect(() => {
    const pack = project.getDefaultPackage()
    const file = pack.getDefaultFile()
    const editorState = new EditorState()

    const selectFile = async (pack: SplootPackage, file: SplootFile) => {
      // Build scope
      await generateScope(file.rootNode)

      // Prep NodeBlocks for rendering
      const newRootNode = new NodeBlock(null, file.rootNode, editorState.selection, 0)

      // Hook up root node into selection manager.
      // This will trigger calculating dimensions and building the cursor map.
      editorState.setRootNode(newRootNode)

      // Enable mutation firing
      file.rootNode.recursivelySetMutations(true)
      // Validate all nodes, firing validation mutations when invalid.
      file.rootNode.recursivelyValidate()

      // And finally... make the whole thing load.
      setEditorState(editorState)
    }
    pack.getLoadedFile(file.name).then(() => {
      selectFile(pack, file)
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
