# @tapico/msw-webarchive

A utility to drive requests handlers through a `.har` web-archive file for the Mock Service Worker library. This utility allows you to easily mock server handlers by using `.har` web-archive file which can be created by using applications like Charles, ProxyMan or the Chrome Developer Tools.

## Why you use this?

We have been using it during the development of web-applications, while the backend API endpoints weren't available yet or when we want to reproduce a problem of a customer. This way we can request the customer to send us a .har web-archive file and let this file drive the network requests to our back-end, this has greatly eased reproducing problems reported.

## Creating a .har web-archive file

You might wonder how can I create a `.har web-archive file`? The Chrome Developer Tools extension which comes with Chrome and Edge has built-in support to export requests as a `.har`-file.

Go to the `Network`-tab in the Developer Tools and right click so the popup context menu appears and here select `Copy -> Copy All as HAR`, the browser will now allow you to save the file to disk.

The file that got saved to disk by Chrome can be used by this utility. All the request which were listed in the `Network`-tab will now be mocked by MSW.

[1]: https://mswjs.io/docs/getting-started/install

## Using the .har file

After you have created the .har web-archive file you can use it with your server instance of the Mock Service Worker, you can find instructions you to get started at: [https://mswjs.io/docs/getting-started/install][1].

After you have created an instance of the Mock Service Worker and have it working in the environment of your choice, for example in Node, you can use the function `setRequestHandlersByWebarchive` to create all the server handlers described in the `.har`-web-archive file.

```js
import default as myWebarchiveFile from './example.har'
setRequestHandlersByWebarchive(server, myWebarchiveFile, {
      quiet: false,
})
```

Now when you do any requests to URLs which have been defined in the web-archive file they will be intercepted by the MSW and return the response described in the `.har` web-archive file.

### Example

An example how we are using this library in our own projects is listed below, first we are creating an instance of MSW service worker, followed by loading our `api-endpoints-with-auth.har` (here renamed `.json` for ease), now you are ready to use.

A common issue when using `.har web-archive file` is that when you are using CORS that wrong headers are being returned by the mocked responses. The library is offering the `resolveCrossOrigins`-callback function which passes the original origin defined in the `Access-Control-Allow-Origin`-header, you can change this behaviour by return '\*' in this callback then any origin will be accepted and the browser will be happy again.

```
import { setupWorker } from 'msw'
import { homepage } from '../../../package.json'
import { default as serverDefinition } from './api-endpoints-with-auth.json'
import { setRequestHandlersByWebarchive } from '@tapico/msw-webarchive'

const fullUrl = new URL(homepage)

const server = setupWorker()
setRequestHandlersByWebarchive(server, serverDefinition, {
  strictQueryString: true,
  quiet: true,
  resolveCrossOrigins: (origin: string) => {
    return '*'
  },
})

server.start({
  quiet: false,
  serviceWorker: {
    url: fullUrl.pathname + 'mockServiceWorker.js',
  },
})

export * from 'msw'
export { server }
```

## Configuration

The `setRequestHandlersByWebarchive` accepts the following options to configure the behaviour:

   - *quiet*: Disable logging of debugging messages (e.g. logs what gets mapped)
   - *strictQueryString*: Sets whether the query string of the request should be strictly adhered to or can be ignored
   - *resolveCrossOrigins*: A callback that gets called when the response includes the `Access-Control-Allow-Origin`-header to allow overriding the value of this header.
