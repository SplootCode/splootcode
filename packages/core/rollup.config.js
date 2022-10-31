import dts from 'rollup-plugin-dts'
import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default [
  {
    plugins: [typescript(), nodeResolve()],
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
    input: 'src/index.ts',
    output: [{ file: `dist/index.d.ts`, format: 'es' }],
    plugins: [nodeResolve(), dts()],
  },
]
