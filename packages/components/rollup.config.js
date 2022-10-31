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
    input: 'src/index.ts',
    output: [{ file: `dist/index.d.ts`, format: 'es' }],
    plugins: [dts(), css()],
  },
]
