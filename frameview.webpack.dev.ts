import { Configuration } from 'webpack'
import { merge } from 'webpack-merge'
import common from './frameview.webpack.common'
import Dotenv from 'dotenv-webpack'

module.exports = merge<Configuration>(common as Configuration, {
  mode: 'development',

  plugins: [new Dotenv({ safe: true, path: 'development.env' })],
})
