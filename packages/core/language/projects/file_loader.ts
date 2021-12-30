import { Project } from './project'
import { SplootFile } from './file'
import { SplootNode } from '../node'
import { SplootPackage } from './package'

export interface FileLoader {
  isReadOnly: () => boolean
  loadPackage: (projectId: string, packageId: string) => Promise<SplootPackage>
  loadFile: (projectId: string, packageId: string, filename: string) => Promise<SplootNode>
  saveProject: (project: Project) => Promise<boolean>
  saveFile: (projectId: string, packageId: string, file: SplootFile) => Promise<boolean>
  deleteProject: (project: Project) => Promise<boolean>
}

export interface ProjectMetadata {
  id: string
  title: string
  lastModified: string
}

export interface ProjectLoader {
  listProjectMetadata: () => ProjectMetadata[]
  isValidProjectId: (projectId: string) => boolean
  loadProject: (projectId: string) => Promise<Project>
  newProject: (projectId: string, title: string) => Promise<Project>
  deleteProject: (projectId: string) => Promise<boolean>
  cloneProject: (newProjectId: string, existingProject: Project) => Promise<Project>
  updateProjectMetadata: (project: Project) => Promise<boolean>
}
