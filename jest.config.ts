import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  verbose: true,
  testPathIgnorePatterns: ['node_modules', 'lib', 'dist'],
  moduleNameMapper: {
    '@splootcode/editor/(.*)': '<rootDir>/packages/editor/$1',
    '@splootcode/language-web/(.*)': '<rootDir>/packages/language-web/$1',
    '@splootcode/runtime-python/(.*)': '<rootDir>/packages/runtime-python/$1',
    '@splootcode/runtime-web/(.*)': '<rootDir>/packages/runtime-web/$1',
    '\\.(css|less)$': 'identity-obj-proxy',
  },
}
export default config
