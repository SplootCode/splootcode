import { SerializedProject, Project } from '@splootcode/core/language/projects/project';
import { SplootPackage } from '@splootcode/core/language/projects/package';
import { FileSystemFileLoader } from './filesystem_file_loader';
import { StaticFileLoader } from './static_file_loader';


export async function savePackage(directoryHandle: FileSystemDirectoryHandle, project: Project, pack: SplootPackage) {
  let packDir = await directoryHandle.getDirectoryHandle(pack.name, {create: true});
  const packFile = await packDir.getFileHandle('package.sp', { create: true });
  const writable = await packFile.createWritable();
  await writable.write(pack.serialize());
  await writable.close();
  // Save each file
  let promises = pack.fileOrder.map(async filename => {
    const fileHandle = await packDir.getFileHandle(filename + '.sp', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(pack.files[filename].serialize());
    await writable.close();
  });
  await Promise.all(promises);
}

export async function saveProject(directoryHandle: FileSystemDirectoryHandle, project: Project) {
  // Write project file
  const fileHandle = await directoryHandle.getFileHandle('project.sp', { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(project.serialize());
  await writable.close();
  // Save each package
  project.packages.forEach(pack => {
    savePackage(directoryHandle, project, pack);
  })
}

export async function loadProject(directoryHandle: FileSystemDirectoryHandle) : Promise<Project> {
  let fileLoader = new FileSystemFileLoader(directoryHandle);
  let projStr = await (await (await directoryHandle.getFileHandle('project.sp')).getFile()).text();
  let proj = JSON.parse(projStr) as SerializedProject;
  let packages = proj.packages.map(async packRef => {
    return fileLoader.loadPackage(proj.name, packRef.name);
  })
  return new Project(proj, await Promise.all(packages), fileLoader);
}

export async function loadExampleProject(projectId: string) : Promise<Project> {
  let rootUrl = '/static/projects/' + projectId + '/'
  let fileLoader = new StaticFileLoader(rootUrl);
  let projStr = await (await fetch(rootUrl + 'project.sp')).text()
  let proj = JSON.parse(projStr) as SerializedProject;
  let packages = proj.packages.map(async packRef => {
    return fileLoader.loadPackage(proj.name, packRef.name);
  })
  return new Project(proj, await Promise.all(packages), fileLoader);
}