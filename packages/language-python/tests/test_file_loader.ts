import path from 'path'
import { FileLoader } from '@splootcode/core/language/projects/file_loader'
import { PackageBuildType, SplootPackage } from '@splootcode/core/language/projects/package'
import { Project } from '@splootcode/core/language/projects/project'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SplootFile } from '@splootcode/core/language/projects/file'
import { SplootNode } from '@splootcode/core/language/node'
import { readFile } from 'fs'

export async function loadTestProject(projectID: string, title: string): Promise<Project> {
  const fileLoader = new TestFileLoader()
  const proj = new Project(
    {
      name: projectID,
      title: title,
      layouttype: 'PYTHON_CLI',
      packages: [
        {
          buildType: PackageBuildType.PYTHON,
          name: 'main',
        },
      ],
      splootversion: '1.0',
    },
    [await fileLoader.loadPackage(projectID, 'main')],
    fileLoader
  )
  return proj
}

export class TestFileLoader implements FileLoader {
  isReadOnly() {
    return true
  }

  async loadPackage(projectId: string, packageId: string) {
    if (packageId !== 'main') {
      throw new Error(`Project ${projectId} to load package ${packageId} but only 'main' is supported.`)
    }
    return new SplootPackage(
      projectId,
      {
        name: packageId,
        buildType: PackageBuildType.PYTHON,
        files: [
          {
            name: 'main.py',
            type: 'PYTHON_FILE',
          },
        ],
      },
      this
    )
  }

  async loadFile(projectId: string, packageId: string, filename: string): Promise<SplootNode> {
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

  async saveProject(project: Project) {
    return false
  }

  async saveFile(projectId: string, packageId: string, file: SplootFile) {
    return false
  }

  async deleteProject(project: Project) {
    return false
  }
}