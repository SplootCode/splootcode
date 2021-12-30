import { LocalStorageFileLoader } from './local_storage_file_loader'
import { PYTHON_FILE, PythonFile } from '../language/types/python/python_file'
import { PackageBuildType, SerializedSplootPackage, SplootPackage } from '../language/projects/package'
import { Project, SerializedProject } from '../language/projects/project'
import { ProjectLoader, ProjectMetadata } from '../language/projects/file_loader'

export class LocalStorageProjectLoader implements ProjectLoader {
  listProjectMetadata(): ProjectMetadata[] {
    const projectsJSON = window.localStorage.getItem('projects')
    if (projectsJSON === null) {
      window.localStorage.setItem('projects', '[]')
      return []
    }
    return JSON.parse(projectsJSON) as ProjectMetadata[]
  }

  overwriteProjectMetadata(newMetaData: ProjectMetadata[]) {
    window.localStorage.setItem('projects', JSON.stringify(newMetaData))
  }

  isValidProjectId(projectId: string): boolean {
    const projectMeta = this.listProjectMetadata()
    const exists = projectMeta.find((meta) => meta.id === projectId)
    if (exists) {
      return false
    }
    return true
  }

  async loadProject(projectId: string): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)
    const projKey = `project/${projectId}`
    const projStr = window.localStorage.getItem(projKey)
    const proj = JSON.parse(projStr) as SerializedProject
    const packages = proj.packages.map(async (packRef) => {
      return fileLoader.loadPackage(proj.name, packRef.name)
    })
    return new Project(proj, await Promise.all(packages), fileLoader)
  }

  async newProject(projectId: string, title: string): Promise<Project> {
    const fileLoader = new LocalStorageFileLoader(this)
    const serialisedPackage: SerializedSplootPackage = {
      name: 'main',
      buildType: PackageBuildType.PYTHON,
      files: [],
    }

    const mainPackage = new SplootPackage(projectId, serialisedPackage, fileLoader)
    mainPackage.addFile('main.py', PYTHON_FILE, new PythonFile(null))
    const serialisedProj: SerializedProject = {
      name: projectId,
      layouttype: 'PYTHON_CLI',
      splootversion: '1.0.0',
      title: title,
      packages: [
        {
          name: 'main',
          buildType: PackageBuildType.PYTHON,
        },
      ],
    }
    const proj = new Project(serialisedProj, [mainPackage], fileLoader)
    fileLoader.saveProject(proj)
    this.updateProjectMetadata(proj)
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
    const proj = new Project(serializedProj, packages, fileLoader)
    proj.save()
    this.updateProjectMetadata(proj)
    return proj
  }

  async updateProjectMetadata(project: Project): Promise<boolean> {
    const allMeta = this.listProjectMetadata()
    const meta = allMeta.filter((projectMetadata) => {
      return project.name === projectMetadata.id
    })
    if (meta.length === 0) {
      allMeta.push({
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
    const allMeta = this.listProjectMetadata()
    this.overwriteProjectMetadata(
      allMeta.filter((meta) => {
        return meta.id !== projectId
      })
    )
    return true
  }
}
