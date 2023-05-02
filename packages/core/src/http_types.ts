export interface HTTPScenario {
  id?: number
  name: string
  method: string
  path: string
  protocol: string
  rawQueryString: string
  headers: Record<string, string>
  body: string
  isBase64Encoded: boolean
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

export interface HTTP {
  method: string
  path: string
  protocol: string
}

export interface HTTPResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  isBase64Encoded: boolean
}

export function httpScenarioToHTTPRequestEvent(scenario: HTTPScenario): HTTPRequestAWSEvent {
  const sourceIP = ''
  let userAgent = ''
  let cookies = []

  const loweredHeaders = Object.fromEntries(
    Object.entries(scenario.headers).map(([key, value]) => [key.toLowerCase(), value])
  )

  if (loweredHeaders['cookie']) {
    cookies = loweredHeaders['cookie'].split(';')
  }

  if (loweredHeaders['user-agent']) {
    userAgent = loweredHeaders['user-agent']
  }

  return {
    version: '2.0',
    rawPath: scenario.path,
    rawQueryString: scenario.rawQueryString,
    cookies: cookies,
    headers: scenario.headers,
    requestContext: {
      http: {
        method: scenario.method,
        path: scenario.path,
        protocol: scenario.protocol,
        sourceIp: sourceIP,
        userAgent: userAgent,
      },
    },
    body: scenario.body,
    isBase64Encoded: scenario.isBase64Encoded,
  }
}
