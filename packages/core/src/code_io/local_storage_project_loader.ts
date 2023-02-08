import { LocalStorageFileLoader } from './local_storage_file_loader'
import { PackageBuildType, SerializedSplootPackage, SplootPackage } from '../language/projects/package'
import { Project, SerializedProject } from '../language/projects/project'
import { ProjectLoader, ProjectMetadata, SaveError } from '../language/projects/file_loader'
import { SerializedNode, deserializeNode } from '../language/type_registry'

const startingPythonFile: SerializedNode = {
  type: 'PYTHON_FILE',
  properties: {},
  childSets: { body: [] },
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
    return new Project(ownerId, proj, await Promise.all(packages), fileLoader)
  }

  async newProject(onwerId: string, projectId: string, title: string, layoutType: string): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)

    const serialisedProj: SerializedProject = {
      name: projectId,
      layouttype: layoutType,
      splootversion: '1.0.0',
      version: '1',
      title: title,
      environmentVars: {},
      packages: [],
    }
    const proj = new Project(onwerId, serialisedProj, [], fileLoader)
    const mainPackage = proj.addNewPackage('main', PackageBuildType.PYTHON)
    await mainPackage.addFile('main.py', 'PYTHON_FILE', deserializeNode(startingPythonFile))
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
    const proj = new Project(newOwnerID, serializedProj, packages, fileLoader)

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
    window.localStorage.setItem(projKey, project.serialize())
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
      })
      this.overwriteProjectMetadata(allMeta)
      return
    }
    this.overwriteProjectMetadata(
      allMeta.map((projectMetadata) => {
        if (projectMetadata.id === project.name && projectMetadata.owner === project.owner) {
          projectMetadata.title = project.title
          projectMetadata.lastModified = ''
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
