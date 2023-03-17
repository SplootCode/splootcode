import { HTTPScenario } from '../http_types'
import { LocalStorageFileLoader } from './local_storage_file_loader'
import { PackageBuildType, SerializedSplootPackage, SplootPackage } from '../language/projects/package'
import { Project, SerializedProject } from '../language/projects/project'
import { ProjectLoader, ProjectMetadata, SaveError } from '../language/projects/file_loader'
import { RunType } from '../language/projects/run_settings'
import { deserializeNode } from '../language/type_registry'
import { startingPythonFile, startingPythonFileHTTP } from './starting_files'

const DEFAULT_HTTP_SCENARIO: HTTPScenario = {
  name: 'Test Request',
  rawQueryString: '?',
  headers: {},
  method: 'GET',
  path: '/',
  protocol: 'HTTP/1.1',
  body: '',
  isBase64Encoded: false,
}

export class LocalStorageProjectLoader implements ProjectLoader {
  async listProjectMetadata(): Promise<ProjectMetadata[]> {
    const projectsJSON = window.localStorage.getItem('projects')
    if (projectsJSON === null) {
      window.localStorage.setItem('projects', '[]')
      return []
    }
    const projectsMeta = JSON.parse(projectsJSON) as ProjectMetadata[]
    projectsMeta.forEach((proj) => {
      proj.owner = proj.owner ?? 'local'
      proj.runType = proj.runType ?? RunType.COMMAND_LINE
    })

    // Only list 'local' owner projects
    projectsMeta.filter((proj) => proj.owner === 'local')

    return projectsMeta
  }

  overwriteProjectMetadata(newMetaData: ProjectMetadata[]) {
    window.localStorage.setItem('projects', JSON.stringify(newMetaData))
  }

  async isValidProjectId(ownerId: string, projectId: string): Promise<boolean> {
    const projectMeta = await this.listProjectMetadata()
    const exists = projectMeta.find((meta) => meta.id === projectId)
    if (exists) {
      return false
    }
    return true
  }

  async generateValidProjectId(ownerId: string, projectId: string, title: string): Promise<[string, string]> {
    let num = 1
    let newProjectId = projectId
    let newTitle = title
    let isValid = await this.isValidProjectId(ownerId, projectId)
    while (!isValid) {
      newProjectId = `${projectId}-${num}`
      newTitle = `${title} (${num})`
      isValid = await this.isValidProjectId(ownerId, newProjectId)
      num++
    }
    return [newProjectId, newTitle]
  }

  async loadProject(ownerId: string, projectId: string): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)
    const projKey = this.getProjKey(ownerId, projectId)
    const projStr = window.localStorage.getItem(projKey)
    if (!projStr) {
      return null
    }
    const proj = JSON.parse(projStr) as SerializedProject
    if (!proj.version) {
      proj.version = (Math.random() + 1).toString(36)
      window.localStorage.setItem(projKey, JSON.stringify(proj))
    }
    const packages = proj.packages.map(async (packRef) => {
      return fileLoader.loadPackage(ownerId, proj.name, packRef.name)
    })
    // Give each of the HTTP Scenarios a unique ID
    if (proj.runSettings?.httpScenarios) {
      proj.runSettings.httpScenarios.forEach((scenario, idx) => {
        scenario.id = idx + 1 // Don't have 0 for ID, for truthiness reasons
      })
    }
    return new Project(ownerId, proj, await Promise.all(packages), fileLoader, this)
  }

  async newProject(
    ownerId: string,
    projectId: string,
    title: string,
    layoutType: string,
    runType: RunType
  ): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)

    const serialisedProj: SerializedProject = {
      name: projectId,
      layouttype: layoutType,
      runSettings: { runType, httpScenarios: [DEFAULT_HTTP_SCENARIO] },
      splootversion: '1.0.0',
      version: '1',
      title: title,
      environmentVars: {},
      packages: [],
    }

    const proj = new Project(ownerId, serialisedProj, [], fileLoader, this)
    const mainPackage = proj.addNewPackage('main', PackageBuildType.PYTHON)

    let startingFile = startingPythonFile
    if (proj.runSettings.runType === RunType.HTTP_REQUEST) {
      startingFile = startingPythonFileHTTP
    }

    await mainPackage.addFile('main.py', 'PYTHON_FILE', deserializeNode(startingFile))
    await this.saveProject(proj)

    return proj
  }

  async cloneProject(
    newOwnerID: string,
    newProjectId: string,
    title: string,
    existingProject: Project
  ): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)
    const serializedProj = JSON.parse(existingProject.serialize()) as SerializedProject
    serializedProj.name = newProjectId
    serializedProj.title = title
    const packagePromises = existingProject.packages.map(async (existingPackage) => {
      const serializedPack: SerializedSplootPackage = {
        name: existingPackage.name,
        buildType: existingPackage.buildType,
        files: [],
      }
      const newPack = new SplootPackage(newOwnerID, newProjectId, serializedPack)

      const filePromises = existingPackage.fileOrder.map((fileName) => {
        return existingPackage.getLoadedFile(fileLoader, fileName)
      })
      const files = await Promise.all(filePromises)
      files.forEach((splootFile) => {
        newPack.addFile(splootFile.name, splootFile.type, splootFile.rootNode)
      })

      return newPack
    })
    const packages = await Promise.all(packagePromises)
    const proj = new Project(newOwnerID, serializedProj, packages, fileLoader, this)

    await this.saveProject(proj)
    await this.updateProjectMetadata(proj)
    return proj
  }

  getStoredProjectVersion(ownerId: string, projectID: string): string {
    const projKey = this.getProjKey(ownerId, projectID)
    const projStr = window.localStorage.getItem(projKey)
    if (projStr === null) {
      return null
    }
    const proj = JSON.parse(projStr) as SerializedProject
    return proj.version
  }

  async deleteHTTPScenario(project: Project, scenarioID: number): Promise<void> {
    const updatedScenarios = project.runSettings.httpScenarios.filter((scenario) => scenario.id !== scenarioID)
    project.runSettings.httpScenarios = updatedScenarios
    await this.saveProject(project)
  }

  async saveHTTPScenario(project: Project, scenario: HTTPScenario): Promise<HTTPScenario> {
    if (!scenario.id) {
      // Get next ID for scenario
      const maxID = project.runSettings.httpScenarios.map((scenario) => scenario.id).reduce((a, b) => Math.max(a, b), 0)
      const newScenario = { ...scenario, id: maxID + 1 }
      // Add scenario
      // This logic for updating the project is duplicated with Project
      // But for local storage, we need to save the whole project in order to save run settings.
      const updatedScenarios = [...project.runSettings.httpScenarios, newScenario]
      project.runSettings.httpScenarios = updatedScenarios
      this.saveProject(project)
      return newScenario
    }

    // Find scenario with that ID and update
    const updatedScenarios = project.runSettings.httpScenarios.map((existingScenario) => {
      if (existingScenario.id === scenario.id) {
        return scenario
      }
      return existingScenario
    })
    project.runSettings.httpScenarios = updatedScenarios
    this.saveProject(project)
    return scenario
  }

  async isCurrentVersion(project: Project): Promise<boolean> {
    const currentSaveVersion = this.getStoredProjectVersion(project.owner, project.name)
    if (currentSaveVersion && currentSaveVersion !== project.version) {
      return false
    }
    return true
  }

  async saveProject(project: Project): Promise<string> {
    // Check local storage if it's got the same base version
    let version
    const base_version = project.version
    if (base_version) {
      const currentSaveVersion = this.getStoredProjectVersion(project.owner, project.name)
      // currentSaveVersion might be null if it's not yet saved.
      if (currentSaveVersion && currentSaveVersion !== base_version) {
        throw new SaveError('Cannot save. This project has been edited and saved in another window.')
      }
      version = base_version
    } else {
      version = (Math.random() + 1).toString(36)
    }

    const projKey = this.getProjKey(project.owner, project.name)
    for (const splootPackage of project.packages) {
      const packageKey = `${projKey}/${splootPackage.name}`
      window.localStorage.setItem(packageKey, splootPackage.serialize())
      for (const filename of splootPackage.fileOrder) {
        version = await project.fileLoader.saveFile(
          project.owner,
          project.name,
          splootPackage.name,
          splootPackage.files[filename],
          version
        )
      }
    }
    project.version = version
    window.localStorage.setItem(projKey, project.serialize(false))
    this.updateProjectMetadata(project)
    return version
  }

  async updateProjectMetadata(project: Project): Promise<boolean> {
    if (project.owner !== 'local') {
      return true
    }
    const allMeta = await this.listProjectMetadata()
    const meta = allMeta.filter((projectMetadata) => {
      return project.name === projectMetadata.id
    })
    if (meta.length === 0) {
      allMeta.push({
        owner: project.owner,
        id: project.name,
        title: project.title,
        lastModified: '',
        live: false,
        shared: false,
        runType: project.runSettings.runType,
      })
      this.overwriteProjectMetadata(allMeta)
      return
    }
    this.overwriteProjectMetadata(
      allMeta.map((projectMetadata) => {
        if (projectMetadata.id === project.name && projectMetadata.owner === project.owner) {
          projectMetadata.title = project.title
          projectMetadata.lastModified = ''
          projectMetadata.runType = project.runSettings.runType
        }
        return projectMetadata
      })
    )
  }

  getProjKey(ownerId: string, projectId: string) {
    if (ownerId === 'local') {
      return `project/${projectId}`
    }
    return `project/${ownerId}/${projectId}`
  }

  async deleteProject(ownerId: string, projectId: string): Promise<boolean> {
    const proj = await this.loadProject(ownerId, projectId)
    const projKey = this.getProjKey(ownerId, projectId)
    proj.packages.forEach((splootPackage) => {
      splootPackage.fileOrder.forEach((filename) => {
        const fileKey = `${projKey}/${splootPackage.name}/${filename}`
        window.localStorage.removeItem(fileKey)
      })
      const packageKey = `${projKey}/${splootPackage.name}`
      window.localStorage.removeItem(packageKey)
    })

    window.localStorage.removeItem(projKey)
    const allMeta = await this.listProjectMetadata()
    this.overwriteProjectMetadata(
      allMeta.filter((meta) => {
        return meta.id !== projectId
      })
    )
    return true
  }
}
