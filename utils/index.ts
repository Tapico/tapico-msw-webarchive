// Taken from the node-request-interceptor project on 8 September 2020
// https://github.com/mswjs/node-request-interceptor/blob/14a91900605e339cc2f60624bb7a996d2748481c/test/helpers.ts
import nodeFetch, { Response, RequestInfo, RequestInit } from 'node-fetch'

interface PromisifiedFetchPayload {
  res: Response
  url: string
  init?: RequestInit
}

export async function fetch(
  info: RequestInfo,
  init?: RequestInit
): Promise<PromisifiedFetchPayload> {
  let url = ''
  const res = await nodeFetch(info, init)

  if (typeof info === 'string') {
    url = info
  } else if ('href' in info) {
    url = info.href
  } else if ('url' in info) {
    url = info.url
  }

  return {
    res,
    url,
    init,
  }
}
