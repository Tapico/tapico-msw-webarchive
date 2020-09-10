import { server } from '../../mocks/server'
import { setRequestHandlersByWebarchive } from '../node'
import { fetch } from '../../utils/index'
import { default as webarchiveDefinition } from '../../example/webarchive.har'
import { default as emptyWebarchiveDefinition } from '../../example/empty-webarchive.har'
import { default as corsExampleDefinition } from '../../example/cors-example.har'

describe('webArchiveHandlerProvider', () => {
  beforeAll(() => {
    jest.clearAllMocks()
    server.listen({
      onUnhandledRequest: 'warn',
    })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it('should warn when no definitions are given', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    setRequestHandlersByWebarchive(server, emptyWebarchiveDefinition, {
      quiet: false,
      strictQueryString: true,
    })

    expect(console.warn).toBeCalledWith(
      'Note: No request definitions found in passed web-archive file'
    )
  })

  it('should handle request from webarchive', async () => {
    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      quiet: false,
      strictQueryString: true,
    })

    const { res } = await fetch(`https://www.archaeology.org/`, { method: 'GET' })
    expect(res.ok).toBe(true)
    const responseText = await res.text()
    expect(responseText).toMatch(
      /Daily archaeological news and exclusive online features, plus articles from the current issue and back issues/gi
    )
  })

  it('should trigger origin callback when requested', async () => {
    const resolveCrossOrigins = jest.fn().mockImplementation(() => 'https://mswjs.io')
    setRequestHandlersByWebarchive(server, corsExampleDefinition, {
      quiet: true,
      strictQueryString: true,
      resolveCrossOrigins,
    })

    const { res } = await fetch(`https://swapi.dev/api/people/1`, {
      method: 'GET',
    })
    expect(res.url).toBe(`https://swapi.dev/api/people/1`)
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
    expect(res.headers.get('access-control-allow-origin')).toEqual('https://mswjs.io')
    expect(resolveCrossOrigins).toHaveBeenCalledWith('*')
    const responseText = await res.json()
    expect(responseText).toEqual(expect.objectContaining({ name: 'Luke Skywalker' }))
  })
})
