import { StatementCapture } from '../capture/runtime_capture'

export enum NodeAnnotationType {
  ParseError = 1,
  RuntimeError,
  Assignment,
  ReturnValue,
  SideEffect,
  LoopIterations,
}

export type NodeAnnotation = {
  type: NodeAnnotationType
  value:
    | RuntimeErrorAnnotation
    | AssignmentAnnotation
    | SideEffectAnnotation
    | ReturnValueAnnotation
    | ParseErrorAnnotation
}

export type ParseErrorAnnotation = {
  message: string
  blameChild: number
}

export type LoopAnnotation = {
  label: string
  iterations: number
  currentFrame: number
}

export type RuntimeErrorAnnotation = {
  errorType: string
  errorMessage: string
}

export type AssignmentAnnotation = {
  variableName: string
  value: string
  type: string
}

export type SideEffectAnnotation = {
  message: string
}

export type ReturnValueAnnotation = {
  type: string
  value: string
}

export function getSideEffectAnnotations(capture: StatementCapture): NodeAnnotation[] {
  if (!capture.sideEffects || capture.sideEffects.length === 0) {
    return []
  }
  const annotations: NodeAnnotation[] = []
  const stdout = capture.sideEffects
    .filter((sideEffect) => sideEffect.type === 'stdout')
    .map((sideEffect) => sideEffect.value)
    .join('')
  annotations.push({
    type: NodeAnnotationType.SideEffect,
    value: {
      message: `prints "${stdout}"`,
    },
  })
  return annotations
}
