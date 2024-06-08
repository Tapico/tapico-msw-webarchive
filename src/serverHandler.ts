import { delay, http, HttpResponse, ResponseResolver, HttpRequestHandler } from 'msw'

export type ResponseDelayFunction = (timeDelay: number, requestContext: Request) => number

export type ResponseDelayOption = 'real' | 'none' | ResponseDelayFunction 

export interface ServerDefinitionOptions {
  strictQueryString?: boolean
  useUniqueRequests?: boolean
  resolveCrossOrigins?: (origin: string) => string
  quiet?: boolean
  domainMappings?: Record<string, string>,
  responseDelay?: ResponseDelayOption,
}

/**
 * @private
 * Returns a function which calculates the response delay based on the chosen responseDelay option
 * @param responseDelayOption The chosen responseDelay option or undefined if no option was chosen
 */
function getResponseDelayFunction(responseDelayOption?: ResponseDelayOption): ResponseDelayFunction {
  if (responseDelayOption === 'none') {
    return () => 0
  }

  if (typeof responseDelayOption === 'function') {
    return responseDelayOption
  }

  // use real delay when responseDelay is 'real', not explicitly set, or set to an unexpected value
  return timeDelay => timeDelay
}

/**
 * @private
 * Returns the entries defined in the web-archive file
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

  if (typeof url !== 'string') {
    throw new Error(`url must a string, got: '${typeof url}'`)
  }

  let urlToUse = url
  if (options?.domainMappings) {
    for (const entry of Object.entries(options.domainMappings)) {
      const [from, to] = entry
      if (urlToUse.startsWith(from)) {
        urlToUse = urlToUse.replace(from, to)
        logger(`mapping '${url}' to '${urlToUse}'`)
        break
      }
    }
  }

  const responseDelayFunction = getResponseDelayFunction(options?.responseDelay)

  const requestMethod = request.method.toLowerCase()
  const supportedMethods = Object.keys(http).filter((method) => method !== 'all')

  logger(`Registering route for ${entry.request.method} for ${entry.request.url}`)
  if (!supportedMethods.includes(requestMethod)) {
    return null
  }

  const parsedUrl = new URL(urlToUse)
  const fullQualifiedUrl = parsedUrl.href.replace(parsedUrl.search, '')

  // check if we need to look some warnings to the Console or not
  const shouldLog = options?.quiet === false

  const resolver: ResponseResolver = async ({ request }) => {
    const { content: responseBody, status: responseStatus, headers } = response

    // If we strict query string is requested, we will only handle the request when it matches
    if (options?.strictQueryString) {
      const mockRequestUrlInfo = new URL(request.url)
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

    // Set the all headers for the response
    const responseHeaders = headers.reduce(
      (headerObj: Record<string, string>, { name, value }: { name: string; value: string }) => {
        const lowercaseName = name.toLowerCase()
        if (lowercaseName === 'content-encoding') {
          // if a content-encoding header exists, we should skip it from the response as node-fetch and
          // other libraries don't appreciate it when you send a response which isn't actually compressed
          // and at this moment of time. I don't see added value to add support for gzip, brotli
          return headerObj
        }
        if (lowercaseName === 'access-control-allow-origin') {
          logger(`CORS header detected, requesting new origin for ${value}`)
          value = options?.resolveCrossOrigins ? options.resolveCrossOrigins(value) : value
        }

        headerObj[name] = value
        return headerObj
      },
      {}
    )

    // If the request-response pair has a `time`-property populated we use it as the delay for the mock response
    const responseDelayTimeFromHar = processingTime ? processingTime : 0
    const responseDelayTime = responseDelayFunction(responseDelayTimeFromHar, request.clone())
    if (responseDelayTime > 0) {
      if (shouldLog) {
        logger('warn', `Response will be delayed with ${responseDelayTime}ms`)
      }
      await delay(responseDelayTime)
    }

    return new HttpResponse(responseData, {
      headers: responseHeaders,
      status: responseStatus,
    })
  }

  // Ensure the right request route method is used for the registration
  const route = ((http as any)[requestMethod] as HttpRequestHandler)(fullQualifiedUrl, resolver, {
    once: !!options?.useUniqueRequests,
  })
  if (!route) {
    return null
  }

  return route
}
