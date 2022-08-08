import { FileSystemFileLoader } from './filesystem_file_loader'
import { Project, SerializedProject } from '../language/projects/project'
import { SplootPackage } from '../language/projects/package'

async function savePackage(directoryHandle: FileSystemDirectoryHandle, project: Project, pack: SplootPackage) {
  const packDir = await directoryHandle.getDirectoryHandle(pack.name, { create: true })
  const packFile = await packDir.getFileHandle('package.sp', { create: true })
  const writable = await packFile.createWritable()
  await writable.write(pack.serialize())
  await writable.close()
  // Save each file
  const promises = pack.fileOrder.map(async (filename) => {
    const fileHandle = await packDir.getFileHandle(filename + '.sp', { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(pack.files[filename].serialize())
    await writable.close()
  })
  await Promise.all(promises)
}

export async function exportProjectToFolder(directoryHandle: FileSystemDirectoryHandle, project: Project) {
  // Write project file
  const fileHandle = await directoryHandle.getFileHandle('project.sp', { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(project.serialize())
  await writable.close()
  // Save each package
  project.packages.forEach((pack) => {
    savePackage(directoryHandle, project, pack)
  })
}

export async function loadProjectFromFolder(directoryHandle: FileSystemDirectoryHandle): Promise<Project> {
  const fileLoader = new FileSystemFileLoader(directoryHandle)
  const projStr = await (await (await directoryHandle.getFileHandle('project.sp')).getFile()).text()
  const proj = JSON.parse(projStr) as SerializedProject
  const packages = proj.packages.map(async (packRef) => {
    return fileLoader.loadPackage(proj.name, packRef.name)
  })
  return new Project('local', proj, await Promise.all(packages), fileLoader)
}
