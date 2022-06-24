import { DATA_SHEET } from '@splootcode/language-web/types/dataset/datasheet'
import { JAVASCRIPT_FILE } from '@splootcode/language-web/types/js/javascript_file'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { loadTypes } from '@splootcode/language-web/type_loader'

const CacheName = 'splootcache-v1'

loadTypes()

self.addEventListener('install', function (event) {
  caches.delete(CacheName)
  return Promise.resolve('loaded')
})

async function addFileToCache(pathname: string, contentType: string, contents: string) {
  caches.open(CacheName).then(function (cache) {
    const request = pathname
    const headers = {
      'Content-Type': contentType,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    }
    const response = new Response(contents, { status: 200, statusText: 'ok', headers: headers })
    cache.put(request, response)
  })
}

self.addEventListener('fetch', (event: FetchEvent) => {
  const reqUrl = new URL(event.request.url)
  if (reqUrl.origin === self.location.origin) {
    event.respondWith(
      caches.open(CacheName).then((cache) => {
        return cache.match(event.request).then(function (response) {
          return response || fetch(event.request)
        })
      })
    )
  }
})

function handleNodeTree(filename: string, serializedNode: SerializedNode) {
  const rootNode = deserializeNode(serializedNode)
  if (rootNode === null) {
    console.warn('Failed to deserialize node tree.')
    return
  }
  let contentType = 'text/html;charset=UTF-8'
  switch (serializedNode.type) {
    case JAVASCRIPT_FILE:
    case DATA_SHEET:
      contentType = 'text/javascript'
      break
  }
  addFileToCache('/' + filename, contentType, rootNode.generateCodeString())
}

self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data
  if (event.origin == self.location.origin) {
    switch (data.type) {
      case 'nodetree':
        const { filename, tree } = data.data
        handleNodeTree(filename, tree as SerializedNode)
        // @ts-ignore
        event.source.postMessage({ type: 'loaded', filename: filename })
        break
      default:
        console.log('Service worker. Unknown message from origin:', event)
    }
  }
})
