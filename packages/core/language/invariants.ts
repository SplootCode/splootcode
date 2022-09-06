export enum InvariantViolationType {
  Unknown = 0,
  ChildSetNodeCategory,
  FragmentNodeCategory,
}

export class InvariantViolationError extends Error {
  constructor(type: InvariantViolationType, msg: string) {
    super(msg)
  }
}
