import { Project } from './project'
import { SplootFile } from './file'
import { SplootNode } from '../node'
import { SplootPackage } from './package'

export interface FileLoader {
  isReadOnly: () => boolean
  loadPackage: (ownerID: string, projectId: string, packageId: string) => Promise<SplootPackage>
  loadFile: (ownerID: string, projectId: string, packageId: string, filename: string) => Promise<SplootNode>
  saveFile: (
    ownerID: string,
    projectId: string,
    packageId: string,
    file: SplootFile,
    base_version: string
  ) => Promise<string>
}

export interface ProjectMetadata {
  owner: string
  id: string
  title: string
  lastModified: string
  live?: boolean
}

export interface ProjectLoader {
  listProjectMetadata: () => Promise<ProjectMetadata[]>
  isValidProjectId: (ownerId: string, projectId: string) => Promise<boolean>
  generateValidProjectId: (ownerId: string, projectId: string, title: string) => Promise<[string, string]>
  loadProject: (ownerId: string, projectId: string) => Promise<Project>
  newProject: (ownerId: string, projectId: string, title: string, layoutType: string) => Promise<Project>
  deleteProject: (ownerId: string, projectId: string) => Promise<boolean>
  cloneProject: (newOwnerId: string, newProjectId: string, title: string, existingProject: Project) => Promise<Project>
  saveProject: (project: Project) => Promise<string>
  isCurrentVersion: (project: Project) => Promise<boolean>
}

export class SaveError extends Error {
  constructor(msg: string) {
    super(msg)
  }
}
