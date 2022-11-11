import path from 'path'
import {
  FileLoader,
  PackageBuildType,
  Project,
  SerializedNode,
  SplootFile,
  SplootNode,
  SplootPackage,
  deserializeNode,
} from '@splootcode/core'
import { readFile } from 'fs'

export async function loadTestProject(projectID: string, title: string): Promise<Project> {
  const fileLoader = new TestFileLoader()
  const proj = new Project(
    'examples',
    {
      name: projectID,
      title: title,
      layouttype: 'PYTHON_CLI',
      version: '1',
      packages: [
        {
          buildType: PackageBuildType.PYTHON,
          name: 'main',
        },
      ],
      splootversion: '1.0',
    },
    [await fileLoader.loadPackage('examples', projectID, 'main')],
    fileLoader
  )
  return proj
}

export class TestFileLoader implements FileLoader {
  isReadOnly() {
    return true
  }

  async loadPackage(ownerID: string, projectId: string, packageId: string) {
    if (packageId !== 'main') {
      throw new Error(`Project ${projectId} to load package ${packageId} but only 'main' is supported.`)
    }
    return new SplootPackage(ownerID, projectId, {
      name: packageId,
      buildType: PackageBuildType.PYTHON,
      files: [
        {
          name: 'main.py',
          type: 'PYTHON_FILE',
        },
      ],
    })
  }

  async loadFile(ownerID: string, projectId: string, packageId: string, filename: string): Promise<SplootNode> {
    if (filename !== 'main.py') {
      throw new Error(`Attempted to load file ${filename} but only 'main.py' is supported.`)
    }
    const testFilename = path.resolve(__dirname, 'test_data', `${projectId}_main.json`)
    const contents = await new Promise<string>((resolve, reject) => {
      readFile(testFilename, 'utf8', (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })

    return deserializeNode(JSON.parse(contents) as SerializedNode)
  }

  async saveProject(project: Project, base_version: string) {
    return ''
  }

  async saveFile(ownerID: string, projectId: string, packageId: string, file: SplootFile, base_version: string) {
    return ''
  }

  async deleteProject(project: Project) {
    return false
  }
}
