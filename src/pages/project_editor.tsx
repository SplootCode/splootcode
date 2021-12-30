import './project_editor.css'

import React, { useEffect, useState } from 'react'
import { MainMenuItem, MenuBar, MenuBarItem } from '@splootcode/components/menu_bar'
import { Project } from '@splootcode/core/language/projects/project'
import { ProjectLoader } from '@splootcode/core/language/projects/file_loader'
import { PythonEditorPanels } from './python_editor'
import { exportProjectToFolder, loadProjectFromFolder } from '@splootcode/core/code_io/filesystem'
import { loadExampleProject } from '../code_io/static_projects'
import { useHistory, useParams } from 'react-router-dom'

interface ProjectEditorProps {
  projectLoader: ProjectLoader
}

export const ProjectEditor = (props: ProjectEditorProps) => {
  const { projectID, ownerID } = useParams() as { ownerID: string; projectID: string }
  const [loadedProject, setLoadedProject] = useState<Project>(null)
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
        const title = prompt('Enter title for new project: ')
        props.projectLoader.newProject(title, title).then((proj) => {
          history.push(`/p/local/${title}`)
        })
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
        const title = prompt('Enter title for new project: ')
        props.projectLoader.cloneProject(title, loadedProject).then((newProj) => {})
        history.push(`/p/local/${title}`)
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
        const isValid = props.projectLoader.isValidProjectId(proj.name)
        let newName = proj.name
        if (!isValid) {
          newName = prompt('Project ID already exists or is invalid. Please enter a new name:')
        }
        props.projectLoader.cloneProject(newName, proj).then((newProj) => {
          history.push(`/p/local/${newName}`)
        })
      },
    },
  ]

  return (
    <React.Fragment>
      <MenuBar menuItems={menuItems}>
        <MenuBarItem>{loadedProject === null ? '' : `${ownerID} - ${loadedProject.title}`} </MenuBarItem>
      </MenuBar>
      <div className="project-editor-container">
        {loadedProject === null ? <div>Loading... </div> : <PythonEditorPanels project={loadedProject} />}
      </div>
    </React.Fragment>
  )
}
