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
  rawPath: string
  rawQueryString: string
  cookies: string[]
  headers: Record<string, string>
  requestContext: RequestContext
  body: string
  isBase64Encoded: boolean
}
