import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

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
        streamlit: resolve(__dirname, 'splootstreamlitpythonclient.html'),
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [{ src: resolve(__dirname, 'node_modules', 'structured-pyright', 'dist', 'static'), dest: '' }],
    }),
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
