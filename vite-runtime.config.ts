import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  envPrefix: 'SPLOOT_',
  server: {
    port: 3001,
    strictPort: true,
  },
  assetsInclude: ['**/*.py', '**/*.whl'],
  build: {
    outDir: 'dist-runtime',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'splootframepythonclient.html'),
      },
    },
  },
  plugins: [
    tsconfigPaths({
      projects: ['./packages/runtime-python'],
    }),
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
          res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
          next()
        })
      },
    },
  ],
})
