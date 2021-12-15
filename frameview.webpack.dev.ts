import Dotenv from 'dotenv-webpack'
import common from './frameview.webpack.common'
import { Configuration } from 'webpack'
import { merge } from 'webpack-merge'

module.exports = merge<Configuration>(common as Configuration, {
  mode: 'development',

  plugins: [new Dotenv({ safe: true, path: 'development.env' })],
})
