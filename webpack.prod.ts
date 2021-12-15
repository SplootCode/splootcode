import Dotenv from 'dotenv-webpack'
import common from './webpack.common'
import { Configuration } from 'webpack'
import { merge } from 'webpack-merge'

module.exports = merge<Configuration>(common as Configuration, {
  mode: 'production',

  plugins: [new Dotenv({ safe: true, path: 'production.env' })],
})
