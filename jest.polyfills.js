/**
 * @note Courtesy of https://mswjs.io/docs/faq/#requestresponsetextencoder-is-not-defined-jest
 */
const { ReadableStream, WritableStream, TransformStream } = require('web-streams-polyfill');
if (typeof window !== 'undefined') {
  window.ReadableStream = ReadableStream;
  window.WritableStream = WritableStream;
  window.TransformStream = TransformStream;
}

const { TextDecoder, TextEncoder } = require('node:util')
 
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
})
 
const { Blob, File } = require('node:buffer')
const { fetch, Headers, FormData, Request, Response } = require('undici')
 
Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true },
  Blob: { value: Blob },
  File: { value: File },
  Headers: { value: Headers },
  FormData: { value: FormData },
  Request: { value: Request },
  Response: { value: Response },
})
