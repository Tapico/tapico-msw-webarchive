import { RequestHandlersList } from 'msw/lib/types/setupWorker/glossary'
import { SetupWorkerApi } from 'msw/lib/types/setupWorker/setupWorker'
import {
  ServerDefinitionOptions,
  createRequestHandler,
  getEntriesFromWebarchive,
} from './serverHandler'

/**
 * Sets the request handlers for the given server based on the request-response pairs described
 * in the given Webarchive file (.har)
 *
 * @param serverInstance  the instance of the msw server
 * @param definitions     the contents of the WebArchive file (.har)
 * @param options         the options
 */
export function setRequestHandlersByWebarchive(
  serverInstance: SetupWorkerApi,
  definitions: Record<string, any>,
  options?: ServerDefinitionOptions
) {
  const entries = getEntriesFromWebarchive(definitions)

  const requestHandlers: RequestHandlersList = entries.map((definitionEntry: any) => {
    return createRequestHandler(definitionEntry, options)
  })

  const filteredRequestHandlers = requestHandlers.filter(Boolean)
  serverInstance.use(...filteredRequestHandlers)
}
