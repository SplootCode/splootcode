import './project_editor.css'

import React, { useEffect, useState } from 'react'
import { AutosaveHandler } from '@splootcode/components'
import { MainMenuItem, MenuBar, MenuBarItem } from '@splootcode/components'
import { Project } from '@splootcode/core'
import { ProjectLoader } from '@splootcode/core'
import { PythonEditorPanels } from './python_editor'
import { SaveProjectModal } from '@splootcode/components'
import { exportProjectToFolder, loadProjectFromFolder } from '@splootcode/core'
import { loadExampleProject } from '../code_io/static_projects'
import { useHistory, useParams } from 'react-router-dom'

interface ProjectEditorProps {
  projectLoader: ProjectLoader
}

export const ProjectEditor = (props: ProjectEditorProps) => {
  const { projectLoader } = props
  const { projectID, ownerID } = useParams() as { ownerID: string; projectID: string }
  const [loadedProject, setLoadedProject] = useState<Project>(null)
  const [saveProjectModalState, setSaveProjectModalState] = useState({ open: false, clonedFrom: null })

  const history = useHistory()

  const loadProjectFromStorage = () => {
    setLoadedProject(null)
    if (ownerID === 'examples') {
      loadExampleProject(projectID).then((proj) => {
        setLoadedProject(proj)
      })
    } else if (ownerID === 'local') {
      projectLoader.loadProject(projectID).then((proj) => {
        setLoadedProject(proj)
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
  ]

  return (
    <React.Fragment>
      <SaveProjectModal
        clonedFrom={saveProjectModalState.clonedFrom}
        isOpen={saveProjectModalState.open}
        projectLoader={props.projectLoader}
        onClose={() => setSaveProjectModalState({ open: false, clonedFrom: null })}
        onComplete={(projectID, title) => {
          if (saveProjectModalState.clonedFrom) {
            const proj = saveProjectModalState.clonedFrom
            props.projectLoader.cloneProject(projectID, title, proj).then((newProj) => {
              history.push(`/p/local/${projectID}`)
              setSaveProjectModalState({ open: false, clonedFrom: null })
            })
          } else {
            props.projectLoader.newProject(projectID, title, 'PYTHON_CLI').then(() => {
              history.push(`/p/local/${projectID}`)
              setSaveProjectModalState({ open: false, clonedFrom: null })
            })
          }
        }}
      />
      <MenuBar menuItems={menuItems}>
        <MenuBarItem>{loadedProject === null ? '' : `${ownerID} - ${loadedProject.title}`} </MenuBarItem>
        <MenuBarItem>
          {loadedProject ? (
            <AutosaveHandler
              project={loadedProject}
              projectLoader={projectLoader}
              reloadProject={loadProjectFromStorage}
            />
          ) : null}
        </MenuBarItem>
      </MenuBar>
      <div className="project-editor-container">
        {loadedProject === null ? (
          <div>Loading... </div>
        ) : (
          <PythonEditorPanels
            project={loadedProject}
            onSaveAs={() => {
              setSaveProjectModalState({ open: true, clonedFrom: loadedProject })
            }}
          />
        )}
      </div>
    </React.Fragment>
  )
}
