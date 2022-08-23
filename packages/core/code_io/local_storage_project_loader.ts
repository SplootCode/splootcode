import { LocalStorageFileLoader } from './local_storage_file_loader'
import { Project, SerializedProject } from '../language/projects/project'
import { ProjectLoader, ProjectMetadata } from '../language/projects/file_loader'
import { SerializedSplootPackage, SplootPackage } from '../language/projects/package'

export class LocalStorageProjectLoader implements ProjectLoader {
  async listProjectMetadata(): Promise<ProjectMetadata[]> {
    const projectsJSON = window.localStorage.getItem('projects')
    if (projectsJSON === null) {
      window.localStorage.setItem('projects', '[]')
      return []
    }
    const projectsMeta = JSON.parse(projectsJSON) as ProjectMetadata[]
    projectsMeta.forEach((proj) => {
      proj.owner = 'local'
    })

    return projectsMeta
  }

  overwriteProjectMetadata(newMetaData: ProjectMetadata[]) {
    window.localStorage.setItem('projects', JSON.stringify(newMetaData))
  }

  async isValidProjectId(projectId: string): Promise<boolean> {
    const projectMeta = await this.listProjectMetadata()
    const exists = projectMeta.find((meta) => meta.id === projectId)
    if (exists) {
      return false
    }
    return true
  }

  async generateValidProjectId(projectId: string, title: string): Promise<[string, string]> {
    let num = 1
    let newProjectId = projectId
    let newTitle = title
    let isValid = await this.isValidProjectId(projectId)
    while (!isValid) {
      newProjectId = `${projectId}-${num}`
      newTitle = `${title} (${num})`
      isValid = await this.isValidProjectId(newProjectId)
      num++
    }
    return [newProjectId, newTitle]
  }

  async loadProject(projectId: string): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)
    const projKey = `project/${projectId}`
    const projStr = window.localStorage.getItem(projKey)
    const proj = JSON.parse(projStr) as SerializedProject
    if (!proj.version) {
      proj.version = (Math.random() + 1).toString(36)
      window.localStorage.setItem(projKey, JSON.stringify(proj))
    }
    const packages = proj.packages.map(async (packRef) => {
      return fileLoader.loadPackage(proj.name, packRef.name)
    })
    return new Project('local', proj, await Promise.all(packages), fileLoader)
  }

  async newProject(projectId: string, title: string, layoutType: string): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)

    const serialisedProj: SerializedProject = {
      name: projectId,
      layouttype: layoutType,
      splootversion: '1.0.0',
      version: '1',
      title: title,
      packages: [],
    }
    const proj = new Project('local', serialisedProj, [], fileLoader)
    await fileLoader.saveProject(proj, null)
    return proj
  }

  async cloneProject(newProjectId: string, title: string, existingProject: Project): Promise<Project> {
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
      const newPack = new SplootPackage(newProjectId, serializedPack, fileLoader)

      const filePromises = existingPackage.fileOrder.map((fileName) => {
        return existingPackage.getLoadedFile(fileName)
      })
      const files = await Promise.all(filePromises)
      files.forEach((splootFile) => {
        newPack.addFile(splootFile.name, splootFile.type, splootFile.rootNode)
      })

      return newPack
    })
    const packages = await Promise.all(packagePromises)
    const proj = new Project('local', serializedProj, packages, fileLoader)
    proj.save()
    this.updateProjectMetadata(proj)
    return proj
  }

  async updateProjectMetadata(project: Project): Promise<boolean> {
    const allMeta = await this.listProjectMetadata()
    const meta = allMeta.filter((projectMetadata) => {
      return project.name === projectMetadata.id
    })
    if (meta.length === 0) {
      allMeta.push({
        owner: 'local',
        id: project.name,
        title: project.title,
        lastModified: '',
      })
      this.overwriteProjectMetadata(allMeta)
      return
    }
    this.overwriteProjectMetadata(
      allMeta.map((projectMetadata) => {
        if (projectMetadata.id === project.name) {
          projectMetadata.owner = 'local'
          projectMetadata.title = project.title
          projectMetadata.lastModified = ''
        }
        return projectMetadata
      })
    )
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const proj = await this.loadProject(projectId)
    await proj.delete()
    const allMeta = await this.listProjectMetadata()
    this.overwriteProjectMetadata(
      allMeta.filter((meta) => {
        return meta.id !== projectId
      })
    )
    return true
  }
}
