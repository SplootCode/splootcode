import inject from '@rollup/plugin-inject'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import react from '@vitejs/plugin-react'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  envPrefix: 'SPLOOT_',
  server: {
    port: 3001,
    strictPort: true,
  },
  assetsInclude: ['**/*.py', '**/*.whl'],
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
    outDir: 'dist-runtime',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'splootframepythonclient.html'),
        streamlit: resolve(__dirname, 'splootframepythonclient.html'),
      },
      plugins: [
        {
          ...inject({
            Buffer: ['buffer/', 'Buffer'],
            process: 'process-es6/',
          }),
        },
        nodePolyfills(),
      ],
      output: {
        manualChunks: {
          xterm: ['xterm'],
        },
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
          next()
        })
      },
    },
  ],
})
