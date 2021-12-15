import { AssignmentAnnotation, ReturnValueAnnotation } from '../../annotations/annotations'

export function formatPythonData(value: string, type: string): string {
  switch (type) {
    case 'str':
      return `"${value}" (str)`
    case 'bool':
    case 'NoneType':
      return value
    default:
      return `${value} (${type})`
  }
}

export function formatPythonReturnValue(value: ReturnValueAnnotation): string {
  return `→ ${formatPythonData(value.value, value.type)}`
}

export function formatPythonAssingment(value: AssignmentAnnotation): string {
  return `${value.variableName} = ${formatPythonData(value.value, value.type)}`
}
