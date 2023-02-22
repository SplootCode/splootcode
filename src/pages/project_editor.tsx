import './project_editor.css'

import React, { useEffect, useState } from 'react'
import { AutosaveInfo, EditorHostingConfig, EditorState, EditorStateContext } from '@splootcode/editor'
import { MainMenuItem, MenuBar, MenuBarItem, SaveProjectModal } from '@splootcode/components'
import { Project, ProjectLoader, exportProjectToFolder, loadProjectFromFolder } from '@splootcode/core'
import { PythonEditorPanels } from './python_editor_panels'
import { loadExampleProject } from '../code_io/static_projects'
import { observer } from 'mobx-react'
import { useHistory, useParams } from 'react-router-dom'
import { useToast } from '@chakra-ui/react'

const hostingConfig: EditorHostingConfig = {
  TYPESHED_PATH: import.meta.env.SPLOOT_TYPESHED_PATH,
  FRAME_VIEW_SCHEME: import.meta.env.SPLOOT_FRAME_VIEW_SCHEME,
  FRAME_VIEW_DOMAIN: import.meta.env.SPLOOT_FRAME_VIEW_DOMAIN,
}

interface ProjectEditorProps {
  projectLoader: ProjectLoader
}

export const ProjectEditor = observer((props: ProjectEditorProps) => {
  const { projectLoader } = props
  const { projectID, ownerID } = useParams() as { ownerID: string; projectID: string }
  const [loadedProject, setLoadedProject] = useState<Project>(null)
  const [saveProjectModalState, setSaveProjectModalState] = useState({ open: false, clonedFrom: null })
  const [editorState, setEditorState] = useState<EditorState>(null)
  const toast = useToast()

  const history = useHistory()

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
    if (!editorState?.autosaveWatcher?.failedSave) {
      return
    }

    toast({
      title: editorState.autosaveWatcher.failedSaveInfo.title,
      position: 'top',
      status: 'warning',
    })
  }, [editorState?.autosaveWatcher?.failedSave])

  useEffect(() => {
    if (loadedProject) {
      const editorState = new EditorState(loadedProject, hostingConfig, projectLoader)
      editorState.loadDefaultFile().then(() => {
        setEditorState(editorState)
      })

      return () => {
        editorState.cleanup()
      }
    }
  }, [loadedProject])

  useEffect(() => {
    loadProjectFromStorage()
  }, [projectID, ownerID])

  useEffect(() => {
    if (!loadedProject?.isReadOnly) {
      const checkVersion = async () => {
        if (document['hidden'] === false) {
          const isCurrent = await projectLoader.isCurrentVersion(loadedProject)
          if (!isCurrent) {
            loadProjectFromStorage()
          }
        }
      }
      window.addEventListener('visibilitychange', checkVersion)
      return () => {
        window.removeEventListener('visibilitychange', checkVersion)
      }
    }
  }, [loadedProject])

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
      <MenuBar menuItems={menuItems}>
        <MenuBarItem>{loadedProject === null ? '' : `${ownerID} - ${loadedProject.title}`} </MenuBarItem>
        <MenuBarItem>{editorState && <AutosaveInfo editorState={editorState} />}</MenuBarItem>
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
})
