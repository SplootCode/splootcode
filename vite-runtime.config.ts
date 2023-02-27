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
    include: ['@chakra-ui/react', '@chakra-ui/icons'],
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
      },
      output: {
        manualChunks: {
          xterm: ['xterm'],
          chakra: ['@chakra-ui/react', '@chakra-ui/icons'],
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
