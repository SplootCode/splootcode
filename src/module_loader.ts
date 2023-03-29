import { TrayCategory } from '@splootcode/core'

export async function getTrayForModule(moduleName: string): Promise<TrayCategory> {
  const res = (await import(`../packages/language-python/tray/${moduleName}.json`)) as TrayCategory
  return res
}
