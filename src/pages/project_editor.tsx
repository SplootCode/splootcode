import './project_editor.css'

import React, { useEffect, useState } from 'react'
import { MenuBar, MenuBarItem } from '@splootcode/components/menu_bar'
import { Project } from '@splootcode/core/language/projects/project'
import { PythonEditorPanels } from './python_editor'
import { loadExampleProject } from '../code_io/project_loader'
import { useParams } from 'react-router-dom'

export const ProjectEditor = () => {
  const { projectID, ownerID } = useParams() as { ownerID: string; projectID: string }
  const [loadedProject, setLoadedProject] = useState<Project>(null)

  useEffect(() => {
    if (ownerID === 'examples') {
      loadExampleProject(projectID).then((proj) => {
        setLoadedProject(proj)
      })
    }
  }, [projectID, ownerID])

  return (
    <React.Fragment>
      <MenuBar>
        <MenuBarItem>{loadedProject === null ? '' : `${ownerID} - ${loadedProject.name}`} </MenuBarItem>
      </MenuBar>
      <div className="project-editor-container">
        {loadedProject === null ? <div>Loading... </div> : <PythonEditorPanels project={loadedProject} />}
      </div>
    </React.Fragment>
  )
}
