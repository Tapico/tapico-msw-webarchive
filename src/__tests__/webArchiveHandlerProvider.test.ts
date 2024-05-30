import { server } from '../../mocks/server'
import { setRequestHandlersByWebarchive } from '../node'
import { ResponseDelayOption } from '../serverHandler'
import { default as webarchiveDefinition } from '../../example/webarchive.har'
import { default as emptyWebarchiveDefinition } from '../../example/empty-webarchive.har'
import { default as corsExampleDefinition } from '../../example/cors-example.har'
import { default as localhostExampleDefinition } from '../../example/localhost.har'

const noop = () => {
  /* noop */
}

describe('webArchiveHandlerProvider', () => {
  beforeAll(() => {
    jest.clearAllMocks()
    server.listen({
      onUnhandledRequest: 'error',
    })
  })

  afterEach(() => {
    server.resetHandlers()
    jest.resetAllMocks()
  })

  afterAll(() => {
    server.close()
  })

  it('should warn when no definitions are given', () => {
    jest.spyOn(console, 'warn').mockImplementation(noop)
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

    const res = await fetch(`https://www.archaeology.org/`, { method: 'GET' })
    expect(res.ok).toBe(true)
    const responseText = await res.text()
    expect(responseText).toMatch(
      /Daily archaeological news and exclusive online features, plus articles from the current issue and back issues/gi
    )
  })

  it('should handle request with content-encoding/compression response header from webarchive', async () => {
    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      quiet: false,
      strictQueryString: true,
    })

    const res = await fetch(`https://www.paleoanthro.org/`, { method: 'GET' })
    expect(res.ok).toBe(true)
    const responseText = await res.text()
    expect(responseText).toMatch(
      /Daily archaeological news and exclusive online features, plus articles from the current issue and back issues/gi
    )
    expect(res.headers.has('content-encoding')).toBe(false)
  })

  it('should trigger origin callback when requested', async () => {
    const resolveCrossOrigins = jest.fn().mockImplementation(() => 'https://mswjs.io')
    setRequestHandlersByWebarchive(server, corsExampleDefinition, {
      quiet: true,
      strictQueryString: true,
      resolveCrossOrigins,
    })

    const res = await fetch(`https://swapi.dev/api/people/1`, {
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

  it('should remap origins if requested', async () => {
    jest.spyOn(console, 'warn').mockImplementation(noop)
    setRequestHandlersByWebarchive(server, localhostExampleDefinition, {
      quiet: true,
      domainMappings: {
        'http://localhost:4000': 'http://localhost:1000',
      },
    })

    const res = await fetch(`http:/localhost:1000/hello`, {
      method: 'GET',
    })

    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)

    const json = await res.json()
    expect(json.foo).toBe('bar')

    expect(console.warn).not.toHaveBeenCalled()
  })

  it('should set response cookies', async () => {
    setRequestHandlersByWebarchive(server, webarchiveDefinition)

    const { headers } = await fetch('https://www.archaeology.org/', { method: 'GET' })
    expect(headers.has('Set-Cookie')).toBe(true)
    expect(headers.get('Set-Cookie')).toEqual(
      'Cookie=c5150f9e4fb9115f58a0464a180eba19=c1me8fjstshl5ejle8hlcu02ge'
    )
  })

  it('should set response headers', async () => {
    const entry = webarchiveDefinition.log.entries[0]
    const expectedHeaders = entry.response.headers
    const testUrl = entry.request.url

    setRequestHandlersByWebarchive(server, webarchiveDefinition)

    const { headers } = await fetch(testUrl, { method: 'GET' })
    const headersIterator = (headers as any).entries()

    const numHeaders = Array.from(headersIterator).length
    expect(numHeaders).toBeGreaterThan(0)
    expect(numHeaders).toEqual(expectedHeaders.length)
    expectedHeaders.forEach(({ name, value }: { name: string; value: string }) => {
      expect(headers.has(name)).toBe(true)
      expect(headers.get(name)).toEqual(value)
    })
  })

  it('should support strict query string matching when enabled', async () => {
    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      strictQueryString: true,
      quiet: false,
    })

    const res = await fetch('https://www.archaeology.org?query=string', { method: 'GET' })
    expect(await res.json()).toEqual({ query: 'string' })
  })

  it.each(['real', undefined, 'invalid value']) 
    ('should use real timing when responseDelay is %o', async responseDelay => {
    const { request, time: expectedDelay } = webarchiveDefinition.log.entries[0]
    const { method, url: testUrl } = request
    jest.spyOn(console, 'warn').mockImplementation(noop)

    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      quiet: false,
      responseDelay: responseDelay as ResponseDelayOption,
    })

    await fetch(testUrl, { method })

    expect(console.warn).toHaveBeenCalledWith(`Response will be delayed with ${expectedDelay}ms`)
  })

  it("should not delay when responseDelay is 'none'", async () => {
    const { method, url: testUrl } = webarchiveDefinition.log.entries[0].request
    jest.spyOn(console, 'warn').mockImplementation(noop)

    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      quiet: false,
      responseDelay: 'none',
    })

    await fetch(testUrl, { method })

    expect(console.warn).not.toHaveBeenCalled()
  })

  it('should support custom delay functions', async () => {
    const { request: requestFromHar, time: delayFromHar } = webarchiveDefinition.log.entries[0]
    const { method, url: testUrl } = requestFromHar
    const expectedDelay = 12
    const expectedHeaders = { testHeader: 'testHeaderValue' }
    jest.spyOn(console, 'warn').mockImplementation(noop)

    let delayFromFn: number | undefined
    let requestFromFn: Request | undefined
    const delayFn = jest.fn().mockImplementation((delay, request) => {
      delayFromFn = delay
      requestFromFn = request
      return expectedDelay
    })

    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      quiet: false,
      responseDelay: delayFn,
    })

    await fetch(testUrl, { headers: expectedHeaders, method })

    expect(console.warn).toHaveBeenCalledWith(`Response will be delayed with ${expectedDelay}ms`)
    expect(delayFn).toHaveBeenCalled()
    expect(delayFromFn).toBe(delayFromHar)
    expect(requestFromFn?.url).toBe(testUrl)
    expect(requestFromFn?.method).toBe(method)
    expect(requestFromFn?.headers?.get('testHeader')).toEqual(expectedHeaders.testHeader)
  })

  it.each([0, -1])
    ('should not delay when a custom delay function returns %s', async delay => {
    const { method, url: testUrl } = webarchiveDefinition.log.entries[0].request
    jest.spyOn(console, 'warn').mockImplementation(noop)

    const delayFn = jest.fn().mockReturnValue(delay)

    setRequestHandlersByWebarchive(server, webarchiveDefinition, {
      quiet: false,
      responseDelay: delayFn,
    })

    await fetch(testUrl, { method })

    expect(console.warn).not.toHaveBeenCalled()
    expect(delayFn).toHaveBeenCalled()
  })
})
