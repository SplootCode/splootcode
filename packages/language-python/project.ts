import { PYTHON_FILE, PythonFile } from './nodes/python_file'
import { PackageBuildType } from '@splootcode/core/language/projects/package'
import { Project } from '@splootcode/core/language/projects/project'

export async function populateNewPythonProject(project: Project): Promise<void> {
  const mainPackage = project.addNewPackage('main', PackageBuildType.PYTHON)

  await mainPackage.addFile('main.py', PYTHON_FILE, new PythonFile(null))
  await project.save()
}
