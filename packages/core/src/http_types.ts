export interface HTTP {
  method: string
  path: string
  protocol: string
}

export interface RequestContext {
  http: HTTP
}

export interface HTTPRequest {
  version: string
  rawQueryString: string
  headers: Record<string, string>
  requestContext: RequestContext
  body: string
  isBase64Encoded: boolean
}

export interface HTTPScenario {
  name: string
  event: HTTPRequest
}

export interface HTTPRequestAWSEvent {
  version: string
  rawPath: string
  rawQueryString: string
  cookies: string[]
  headers: Record<string, string>
  requestContext: RequestContextEvent
  body: string
  isBase64Encoded: boolean
}

export interface RequestContextEvent {
  http: HTTPEvent
}

export interface HTTPEvent {
  method: string
  path: string
  protocol: string
  sourceIp: string
  userAgent: string
}

export interface HTTPResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  isBase64Encoded: boolean
}

export function httpRequestToHTTPRequestEvent(request: HTTPRequest): HTTPRequestAWSEvent {
  const sourceIP = ''
  let userAgent = ''
  let cookies = []

  const loweredHeaders = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), value])
  )

  if (loweredHeaders['cookie']) {
    cookies = loweredHeaders['cookie'].split(';')
  }

  if (loweredHeaders['user-agent']) {
    userAgent = loweredHeaders['user-agent']
  }

  return {
    version: request.version,
    rawPath: request.requestContext.http.path,
    rawQueryString: request.rawQueryString,
    cookies: cookies,
    headers: request.headers,
    requestContext: {
      http: {
        method: request.requestContext.http.method,
        path: request.requestContext.http.path,
        protocol: request.requestContext.http.protocol,
        sourceIp: sourceIP,
        userAgent: userAgent,
      },
    },
    body: request.body,
    isBase64Encoded: request.isBase64Encoded,
  }
}
