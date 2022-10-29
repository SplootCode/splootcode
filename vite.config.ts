import nodePolyfills from 'rollup-plugin-polyfill-node'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { defineConfig } from 'vite'

export default defineConfig({
  envPrefix: 'SPLOOT_',
  appType: 'spa',
  server: {
    port: 3000,
    strictPort: true,
  },
  plugins: [
    tsconfigPaths(),
    react({
      babel: {
        configFile: true,
      },
    }),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
          next()
        })
      },
    },
  ],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
  build: {
    rollupOptions: {
      plugins: [
        // Enable rollup polyfills plugin
        // used during production bundling
        nodePolyfills(),
      ],
    },
  },
})
