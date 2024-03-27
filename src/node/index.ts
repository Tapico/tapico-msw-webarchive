import { HttpHandler } from 'msw'
import { SetupServer } from 'msw/node'
import {
  ServerDefinitionOptions,
  createRequestHandler,
  getEntriesFromWebarchive,
} from '../serverHandler'

/**
 * Sets the request handlers for the given server based on the request-response pairs described
 * in the given Webarchive file (.har)
 *
 * @param serverInstance  the instance of the msw server
 * @param definitions     the contents of the WebArchive file (.har)
 * @param options         the options
 */
export function setRequestHandlersByWebarchive(
  serverInstance: SetupServer,
  definitions: Record<string, any> = {},
  options?: ServerDefinitionOptions
) {
  const entries = getEntriesFromWebarchive(definitions)
  if (!entries.length) {
    if (!options?.quiet) {
      console.warn('Note: No request definitions found in passed web-archive file')
    }
  }

  const requestHandlers: HttpHandler[] = entries.map((definitionEntry: any) => {
    return createRequestHandler(definitionEntry, options)
  }).filter(handler => handler !== null) as HttpHandler[]

  const filteredRequestHandlers = requestHandlers.filter(Boolean)
  serverInstance.use(...filteredRequestHandlers)
}
