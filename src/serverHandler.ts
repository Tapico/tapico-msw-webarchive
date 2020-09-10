import { rest, restContext, MockedRequest, ResponseResolver } from 'msw'
import { ResponseComposition } from 'msw/lib/types/response'
import * as setCookie from 'set-cookie-parser'

export interface ServerDefinitionOptions {
  strictQueryString?: boolean
  useUniqueRequests?: boolean
  resolveCrossOrigins?: (origin: string) => string
  quiet?: boolean
}

interface ItemTuple {
  name: string
  value: string
}

/**
 * @private
 * @param definition the definition
 */
export function getEntriesFromWebarchive(definition: Record<string, any>): any[] {
  if (definition.hasOwnProperty('log')) {
    return definition.log.entries
  }

  if (definition.hasOwnProperty('entries')) {
    return definition.entries
  }

  return []
}

/**
 * @pivate
 * Create an instance of a request handler for the given request-response pair
 *
 * @param entry   the web-archive entry
 * @param options the provider options
 */
export const createRequestHandler = (entry: any, options?: ServerDefinitionOptions) => {
  const { request, response, time: processingTime } = entry
  const { url } = request
  const requestMethod = request.method.toLowerCase()
  const supportedMethods = Object.keys(rest)

  const logger = (level: string, ...args: any[]) => {
    if (options?.quiet) return
    const loglevels = ['warn', 'info', 'debug']
    if (loglevels.includes(level)) {
      const log = (console as any)[level]
      log(...args)
    } else {
      console.log(...[level, ...args])
    }
  }

  logger(`Registering route for ${entry.request.method} for ${entry.request.url}`)
  if (!supportedMethods.includes(requestMethod)) {
    return null
  }

  const parsedUrl = new URL(url)
  const fullQualifiedUrl = parsedUrl.href.replace(parsedUrl.search, '')

  // check if we need to look some warnings to the Console or not
  const shouldLog = options?.quiet === false

  const resolver: ResponseResolver<MockedRequest, typeof restContext> = (
    req: MockedRequest,
    res: ResponseComposition,
    ctx: typeof restContext
  ) => {
    const { content: responseBody, status: responseStatus, headers } = response

    // If we strict query string is requested, we will only handle the request when it matches
    if (options?.strictQueryString) {
      const mockRequestUrlInfo = req.url
      if (parsedUrl.search !== mockRequestUrlInfo.search) {
        if (shouldLog) {
          logger('warn', '[WARNING] Query string did not match')
        }
        return
      }
    }

    // Set the body of the response
    let responseData: Uint8Array | string = responseBody.text
    if (responseBody && responseBody.encoding === 'base64') {
      // Convert the base64 string to a byte array
      const responseBuffer = Uint8Array.from(atob(responseBody.text), (c) => c.charCodeAt(0))
      responseData = responseBuffer
    }
    const responseContext = ctx.body(responseData)

    // If there are any Set-Cookie headers we should parse them and process them
    const cookieHeaders = headers.filter(
      (item: ItemTuple) => item.name.toLowerCase() === 'set-cookie'
    )
    let responseCookies = []
    if (cookieHeaders.length) {
      responseCookies = cookieHeaders
        .map(({ value: cookieString }: { name: string; value: string }) => {
          const [parsedCookie] = setCookie.parse(cookieString)
          const { name, value, httpOnly, path, sameSite, secure, expires } = parsedCookie
          return ctx.cookie(name, value, {
            domain: parsedUrl.host,
            path,
            httpOnly,
            sameSite: sameSite !== '',
            expires,
            secure,
          })
        })
        .filter(Boolean)
    }

    // Set the all headers for the response
    const responseHeaders = headers
      .map(({ name, value }: { name: string; value: string }) => {
        const headerName = name.toLowerCase()
        if (cookieHeaders.length && headerName === 'set-cookie') {
          return null
        }

        if (headerName === 'access-control-allow-origin') {
          logger(`CORS header detected, requesting new origin for ${value}`)
          const newOrigin = options?.resolveCrossOrigins
            ? options?.resolveCrossOrigins(value)
            : value
          value = newOrigin
        }

        return ctx.set(name, value)
      })
      .filter(Boolean)

    // If the request-response pair has a `time`-property populated we use it as the delay for the mock response
    const responseDelayTime = processingTime ? processingTime : 0
    if (responseDelayTime > 0) {
      if (shouldLog) {
        logger('warn', `Response will be delayed with ${responseDelayTime}ms`)
      }
    }

    const registerResolver = options?.useUniqueRequests ? res : res.once
    return registerResolver(
      ...[
        ...responseHeaders,
        ...responseCookies,
        responseContext,
        ctx.delay(responseDelayTime),
        ctx.status(responseStatus),
        ctx.json({ status: true }),
      ]
    )
  }

  // Ensure the right request route method is used for the registration
  const route = (rest as any)[requestMethod](fullQualifiedUrl, resolver)
  if (!route) {
    return null
  }

  return route
}
