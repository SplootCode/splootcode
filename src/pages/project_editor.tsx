import './project_editor.css'

import React, { useEffect, useState } from 'react'
import { AutosaveInfo, EditorHostingConfig, EditorState, EditorStateContext } from '@splootcode/editor'
import { ExportTextModal, MainMenuItem, MenuBar, MenuBarItem, SaveProjectModal } from '@splootcode/components'
import { Project, ProjectLoader, Tongue, exportProjectToFolder, loadProjectFromFolder } from '@splootcode/core'
import { PythonEditorPanels } from './python_editor_panels'
import { loadExampleProject } from '../code_io/static_projects'
import { useHistory, useParams } from 'react-router-dom'

const hostingConfig: EditorHostingConfig = {
  TYPESHED_PATH: import.meta.env.SPLOOT_TYPESHED_PATH,
  FRAME_VIEW_SCHEME: import.meta.env.SPLOOT_FRAME_VIEW_SCHEME,
  FRAME_VIEW_DOMAIN: import.meta.env.SPLOOT_FRAME_VIEW_DOMAIN,
}

interface ProjectEditorProps {
  projectLoader: ProjectLoader
  tongue: Tongue
}

export const ProjectEditor = (props: ProjectEditorProps) => {
  const { projectLoader, tongue } = props
  const { projectID, ownerID } = useParams() as { ownerID: string; projectID: string }
  const [loadedProject, setLoadedProject] = useState<Project>(null)
  const [saveProjectModalState, setSaveProjectModalState] = useState({ open: false, clonedFrom: null })
  const [editorState, setEditorState] = useState<EditorState>(null)
  const [exportTextModalOpen, setExportTextModalOpen] = useState(false)

  const history = useHistory()

  useEffect(() => {
    if (loadedProject) {
      const editorState = new EditorState(loadedProject, hostingConfig, projectLoader, tongue)
      editorState.loadDefaultFile().then(() => {
        setEditorState(editorState)
      })

      return () => {
        editorState.cleanup()
      }
    }
  }, [loadedProject])

  const loadProjectFromStorage = () => {
    setLoadedProject(null)
    if (ownerID === 'examples') {
      loadExampleProject(projectID).then((proj) => {
        setLoadedProject(proj)
        setEditorState(null)
      })
    } else if (ownerID === 'local') {
      projectLoader.loadProject(ownerID, projectID).then((proj) => {
        setLoadedProject(proj)
        setEditorState(null)
      })
    }
  }

  useEffect(() => {
    loadProjectFromStorage()
  }, [projectID, ownerID])

  const menuItems: MainMenuItem[] = [
    {
      name: 'New Project',
      onClick: () => {
        setSaveProjectModalState({ open: true, clonedFrom: null })
      },
    },
    {
      name: 'Save As...',
      onClick: () => {
        setSaveProjectModalState({ open: true, clonedFrom: loadedProject })
      },
    },
    {
      name: 'Export Project',
      onClick: async () => {
        const dirHandle = await window.showDirectoryPicker()
        await exportProjectToFolder(dirHandle, loadedProject)
      },
    },
    {
      name: 'Import Project',
      onClick: async () => {
        const dirHandle = await window.showDirectoryPicker()
        const proj = await loadProjectFromFolder(dirHandle)
        setSaveProjectModalState({ open: true, clonedFrom: proj })
      },
    },
    {
      name: 'Export Python Code',
      onClick: async () => {
        setExportTextModalOpen(true)
      },
    },
  ]

  return (
    <React.Fragment>
      <SaveProjectModal
        clonedFrom={saveProjectModalState.clonedFrom}
        newOwner="local"
        isOpen={saveProjectModalState.open}
        projectLoader={props.projectLoader}
        onClose={() => setSaveProjectModalState({ open: false, clonedFrom: null })}
        onComplete={(owner, projectID) => {
          setSaveProjectModalState({ open: false, clonedFrom: null })
          history.push(`/p/${owner}/${projectID}`)
        }}
      />
      <ExportTextModal
        runtimeManager={editorState?.runtimeContextManager}
        isOpen={exportTextModalOpen}
        onClose={() => setExportTextModalOpen(false)}
      />
      <MenuBar menuItems={menuItems}>
        <MenuBarItem>{loadedProject === null ? '' : `${ownerID} - ${loadedProject.title}`} </MenuBarItem>
        <MenuBarItem>
          {editorState ? <AutosaveInfo editorState={editorState} reloadProject={loadProjectFromStorage} /> : null}
        </MenuBarItem>
      </MenuBar>
      <div className="project-editor-container">
        {editorState ? (
          <EditorStateContext.Provider value={editorState}>
            <PythonEditorPanels
              editorState={editorState}
              onSaveAs={() => setSaveProjectModalState({ open: true, clonedFrom: loadedProject })}
            />
          </EditorStateContext.Provider>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </React.Fragment>
  )
}
