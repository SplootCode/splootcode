import inject from '@rollup/plugin-inject'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  envPrefix: 'SPLOOT_',
  server: {
    port: 3000,
    strictPort: true,
  },
  publicDir: 'public',
  plugins: [
    viteStaticCopy({
      targets: [{ src: resolve(__dirname, 'node_modules', 'structured-pyright', 'dist', 'static'), dest: '' }],
    }),
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
    rollupOptions: {
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
          chakra: [
            '@chakra-ui/react',
            '@chakra-ui/icons',
            '@emotion/react',
            '@emotion/styled',
            'focus-visible',
            'framer-motion',
          ],
          pyright: ['structured-pyright'],
          editor: ['@splootcode/editor'],
          python: ['@splootcode/language-python'],
        },
      },
    },
  },
})
