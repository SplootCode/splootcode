export interface HTTP {
  method: string
  path: string
  protocol: string
  sourceIp: string
  userAgent: string
}

export interface RequestContext {
  http: HTTP
}

export interface HTTPRequestEvent {
  version: string
  rawPath: string
  rawQueryString: string
  cookies: string[]
  headers: Record<string, string>
  requestContext: RequestContext
  body: string
  isBase64Encoded: boolean
}

export interface HTTPScenario {
  name: string
  event: HTTPRequestEvent
}
