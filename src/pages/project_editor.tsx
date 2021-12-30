import './project_editor.css'

import React, { useEffect, useState } from 'react'
import { AutosaveHandler } from '@splootcode/components/autosave_handler'
import { MainMenuItem, MenuBar, MenuBarItem } from '@splootcode/components/menu_bar'
import { Project } from '@splootcode/core/language/projects/project'
import { ProjectLoader } from '@splootcode/core/language/projects/file_loader'
import { PythonEditorPanels } from './python_editor'
import { SaveProjectModal } from '@splootcode/components/save_project_modal'
import { exportProjectToFolder, loadProjectFromFolder } from '@splootcode/core/code_io/filesystem'
import { loadExampleProject } from '../code_io/static_projects'
import { useHistory, useParams } from 'react-router-dom'

interface ProjectEditorProps {
  projectLoader: ProjectLoader
}

export const ProjectEditor = (props: ProjectEditorProps) => {
  const { projectID, ownerID } = useParams() as { ownerID: string; projectID: string }
  const [loadedProject, setLoadedProject] = useState<Project>(null)
  const [saveProjectModalState, setSaveProjectModalState] = useState({ open: false, clonedFrom: null })

  const history = useHistory()

  useEffect(() => {
    if (ownerID === 'examples') {
      loadExampleProject(projectID).then((proj) => {
        setLoadedProject(proj)
      })
    } else if (ownerID === 'local') {
      props.projectLoader.loadProject(projectID).then((proj) => {
        setLoadedProject(proj)
      })
    }
  }, [projectID, ownerID])

  const menuItems: MainMenuItem[] = [
    {
      name: 'New Project',
      onClick: () => {
        setSaveProjectModalState({ open: true, clonedFrom: null })
      },
    },
    {
      name: 'Save',
      disabled: loadedProject?.isReadOnly,
      onClick: () => {
        loadedProject.save()
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
            props.projectLoader.newProject(projectID, title).then((proj) => {
              history.push(`/p/local/${projectID}`)
              setSaveProjectModalState({ open: false, clonedFrom: null })
            })
          }
        }}
      />
      <MenuBar menuItems={menuItems}>
        <MenuBarItem>{loadedProject === null ? '' : `${ownerID} - ${loadedProject.title}`} </MenuBarItem>
        <MenuBarItem>
          <AutosaveHandler project={loadedProject} />
        </MenuBarItem>
      </MenuBar>
      <div className="project-editor-container">
        {loadedProject === null ? <div>Loading... </div> : <PythonEditorPanels project={loadedProject} />}
      </div>
    </React.Fragment>
  )
}
