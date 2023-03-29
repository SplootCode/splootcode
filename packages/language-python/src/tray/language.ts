import { TrayCategory } from '@splootcode/core'

import * as pythonLib from '../generated/python_tray.json'
import * as standardLibModules from '../generated/standard_lib_modules.json'

export const PythonLanguageTray: TrayCategory = pythonLib as TrayCategory

export interface PythonModuleInfo {
  isStandardLib: boolean
  name: string
  description: string
}

export interface ModuleInfoFile {
  allModules: PythonModuleInfo[]
}

const moduleInfoFile = standardLibModules as ModuleInfoFile
export const SupportedModuleList = moduleInfoFile.allModules
