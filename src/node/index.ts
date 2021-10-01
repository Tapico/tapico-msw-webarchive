import { RequestHandler } from 'msw'
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
export interface SetupWorkerNodeApi {
  use(...handlers: RequestHandler[]): void
}

export function setRequestHandlersByWebarchive(
  serverInstance: SetupWorkerNodeApi,
  definitions: Record<string, any> = {},
  options?: ServerDefinitionOptions
) {
  const entries = getEntriesFromWebarchive(definitions)
  if (!entries.length) {
    if (!options?.quiet) {
      console.warn('Note: No request definitions found in passed web-archive file')
    }
  }

  const requestHandlers: RequestHandler[] = entries.map((definitionEntry: any) => {
    return createRequestHandler(definitionEntry, options)
  })

  const filteredRequestHandlers = requestHandlers.filter(Boolean)
  serverInstance.use(...filteredRequestHandlers)
}
