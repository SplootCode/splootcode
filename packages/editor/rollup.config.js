import commonjs from '@rollup/plugin-commonjs'
import css from 'rollup-plugin-import-css'
import dts from 'rollup-plugin-dts'
import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default [
  {
    external: ['react', '@emotion/core', '@emotion/styled', '@chakra-ui/react', '@chakra-ui/icons'],
    plugins: [
      typescript(),
      commonjs(),
      nodeResolve({
        resolveOnly: ['react-icons', 'http-status-codes', 'content-type', 'xterm', 'structured-pyright'],
      }),
      css({ minify: true }),
    ],
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
