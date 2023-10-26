// vite.config.ts
import react from "file:///Users/adam/Projects/sploot/splootcode/node_modules/@vitejs/plugin-react/dist/index.mjs";
import tsconfigPaths from "file:///Users/adam/Projects/sploot/splootcode/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { defineConfig } from "file:///Users/adam/Projects/sploot/splootcode/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import { viteStaticCopy } from "file:///Users/adam/Projects/sploot/splootcode/node_modules/vite-plugin-static-copy/dist/index.js";
var __vite_injected_original_dirname = "/Users/adam/Projects/sploot/splootcode";
var vite_config_default = defineConfig({
  envPrefix: "SPLOOT_",
  server: {
    port: 3e3,
    strictPort: true
  },
  publicDir: "public",
  plugins: [
    viteStaticCopy({
      targets: [{ src: resolve(__vite_injected_original_dirname, "node_modules", "structured-pyright", "dist", "static"), dest: "" }]
    }),
    tsconfigPaths(),
    react({
      babel: {
        configFile: true
      }
    }),
    {
      name: "configure-response-headers",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
          next();
        });
      }
    }
  ],
  optimizeDeps: {
    include: ["@chakra-ui/react", "@chakra-ui/icons"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          chakra: [
            "@chakra-ui/react",
            "@chakra-ui/icons",
            "@emotion/react",
            "@emotion/styled",
            "focus-visible",
            "framer-motion"
          ],
          pyright: ["structured-pyright"],
          editor: ["@splootcode/editor"],
          python: ["@splootcode/language-python"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYWRhbS9Qcm9qZWN0cy9zcGxvb3Qvc3Bsb290Y29kZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2FkYW0vUHJvamVjdHMvc3Bsb290L3NwbG9vdGNvZGUvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2FkYW0vUHJvamVjdHMvc3Bsb290L3NwbG9vdGNvZGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tICd2aXRlLXRzY29uZmlnLXBhdGhzJ1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tICd2aXRlLXBsdWdpbi1zdGF0aWMtY29weSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgZW52UHJlZml4OiAnU1BMT09UXycsXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgfSxcbiAgcHVibGljRGlyOiAncHVibGljJyxcbiAgcGx1Z2luczogW1xuICAgIHZpdGVTdGF0aWNDb3B5KHtcbiAgICAgIHRhcmdldHM6IFt7IHNyYzogcmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnLCAnc3RydWN0dXJlZC1weXJpZ2h0JywgJ2Rpc3QnLCAnc3RhdGljJyksIGRlc3Q6ICcnIH1dLFxuICAgIH0pLFxuICAgIHRzY29uZmlnUGF0aHMoKSxcbiAgICByZWFjdCh7XG4gICAgICBiYWJlbDoge1xuICAgICAgICBjb25maWdGaWxlOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICB7XG4gICAgICBuYW1lOiAnY29uZmlndXJlLXJlc3BvbnNlLWhlYWRlcnMnLFxuICAgICAgY29uZmlndXJlU2VydmVyOiAoc2VydmVyKSA9PiB7XG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKF9yZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0Nyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3knLCAncmVxdWlyZS1jb3JwJylcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeScsICdzYW1lLW9yaWdpbicpXG4gICAgICAgICAgcmVzLnNldEhlYWRlcignQ3Jvc3MtT3JpZ2luLVJlc291cmNlLVBvbGljeScsICdzYW1lLW9yaWdpbicpXG4gICAgICAgICAgbmV4dCgpXG4gICAgICAgIH0pXG4gICAgICB9LFxuICAgIH0sXG4gIF0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFsnQGNoYWtyYS11aS9yZWFjdCcsICdAY2hha3JhLXVpL2ljb25zJ10sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIGNoYWtyYTogW1xuICAgICAgICAgICAgJ0BjaGFrcmEtdWkvcmVhY3QnLFxuICAgICAgICAgICAgJ0BjaGFrcmEtdWkvaWNvbnMnLFxuICAgICAgICAgICAgJ0BlbW90aW9uL3JlYWN0JyxcbiAgICAgICAgICAgICdAZW1vdGlvbi9zdHlsZWQnLFxuICAgICAgICAgICAgJ2ZvY3VzLXZpc2libGUnLFxuICAgICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcHlyaWdodDogWydzdHJ1Y3R1cmVkLXB5cmlnaHQnXSxcbiAgICAgICAgICBlZGl0b3I6IFsnQHNwbG9vdGNvZGUvZWRpdG9yJ10sXG4gICAgICAgICAgcHl0aG9uOiBbJ0BzcGxvb3Rjb2RlL2xhbmd1YWdlLXB5dGhvbiddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1MsT0FBTyxXQUFXO0FBQ3RULE9BQU8sbUJBQW1CO0FBQzFCLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsZUFBZTtBQUN4QixTQUFTLHNCQUFzQjtBQUovQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixXQUFXO0FBQUEsRUFDWCxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0EsV0FBVztBQUFBLEVBQ1gsU0FBUztBQUFBLElBQ1AsZUFBZTtBQUFBLE1BQ2IsU0FBUyxDQUFDLEVBQUUsS0FBSyxRQUFRLGtDQUFXLGdCQUFnQixzQkFBc0IsUUFBUSxRQUFRLEdBQUcsTUFBTSxHQUFHLENBQUM7QUFBQSxJQUN6RyxDQUFDO0FBQUEsSUFDRCxjQUFjO0FBQUEsSUFDZCxNQUFNO0FBQUEsTUFDSixPQUFPO0FBQUEsUUFDTCxZQUFZO0FBQUEsTUFDZDtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0Q7QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGlCQUFpQixDQUFDLFdBQVc7QUFDM0IsZUFBTyxZQUFZLElBQUksQ0FBQyxNQUFNLEtBQUssU0FBUztBQUMxQyxjQUFJLFVBQVUsZ0NBQWdDLGNBQWM7QUFDNUQsY0FBSSxVQUFVLDhCQUE4QixhQUFhO0FBQ3pELGNBQUksVUFBVSxnQ0FBZ0MsYUFBYTtBQUMzRCxlQUFLO0FBQUEsUUFDUCxDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsb0JBQW9CLGtCQUFrQjtBQUFBLEVBQ2xEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRO0FBQUEsWUFDTjtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFVBQ0EsU0FBUyxDQUFDLG9CQUFvQjtBQUFBLFVBQzlCLFFBQVEsQ0FBQyxvQkFBb0I7QUFBQSxVQUM3QixRQUFRLENBQUMsNkJBQTZCO0FBQUEsUUFDeEM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
