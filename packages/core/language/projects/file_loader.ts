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
  owner: string
  id: string
  title: string
  lastModified: string
}

export interface ProjectLoader {
  listProjectMetadata: () => Promise<ProjectMetadata[]>
  isValidProjectId: (projectId: string) => Promise<boolean>
  generateValidProjectId: (projectId: string, title: string) => Promise<[string, string]>
  loadProject: (projectId: string) => Promise<Project>
  newProject: (projectId: string, title: string, layoutType: string) => Promise<Project>
  deleteProject: (projectId: string) => Promise<boolean>
  cloneProject: (newProjectId: string, title: string, existingProject: Project) => Promise<Project>
}
