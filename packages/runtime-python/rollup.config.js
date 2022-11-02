import css from 'rollup-plugin-import-css'
import dts from 'rollup-plugin-dts'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    plugins: [typescript(), css()],
    input: 'src/index.ts',
    output: [
      {
        file: `dist/index.mjs`,
        format: 'es',
        sourcemap: true,
      },
      {
        file: `dist/index.js`,
        format: 'cjs',
        sourcemap: true,
      },
    ],
  },
  {
    plugins: [typescript()],
    input: 'src/webworker.ts',
    output: [
      {
        file: `dist/worker.mjs`,
        format: 'es',
        sourcemap: true,
      },
      {
        file: `dist/worker.js`,
        format: 'cjs',
        sourcemap: true,
      },
    ],
  },
  {
    input: 'src/webworker.ts',
    output: [{ file: `dist/worker.d.ts`, format: 'es' }],
    plugins: [dts(), css()],
  },
]
