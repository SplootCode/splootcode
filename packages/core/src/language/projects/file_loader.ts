import { Dependency, Project } from './project'
import { HTTPScenario } from '../../http_types'
import { RunType } from './run_settings'
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
  shared?: boolean
  runType: RunType
}

export interface ProjectLoader {
  listProjectMetadata: () => Promise<ProjectMetadata[]>
  isValidProjectId: (ownerId: string, projectId: string) => Promise<boolean>
  generateValidProjectId: (ownerId: string, projectId: string, title: string) => Promise<[string, string]>
  loadProject: (ownerId: string, projectId: string) => Promise<Project>
  newProject: (
    ownerId: string,
    projectId: string,
    title: string,
    layoutType: string,
    runType: RunType
  ) => Promise<Project>
  deleteProject: (ownerId: string, projectId: string) => Promise<boolean>
  cloneProject: (newOwnerId: string, newProjectId: string, title: string, existingProject: Project) => Promise<Project>
  saveProject: (project: Project) => Promise<string>
  deleteHTTPScenario: (project: Project, scenarioID: number) => Promise<void>
  saveHTTPScenario: (project: Project, scenario: HTTPScenario) => Promise<HTTPScenario>
  isCurrentVersion: (project: Project) => Promise<boolean>
  saveDependency: (project: Project, dependency: Dependency) => Promise<Dependency>
  deleteDependency: (project: Project, dependencyID: number) => Promise<void>
}

export class SaveError extends Error {
  constructor(msg: string) {
    super(msg)
  }
}
