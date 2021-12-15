import Dotenv from 'dotenv-webpack'
import common from './frameview.webpack.common'
import merge from 'webpack-merge'
import { Configuration } from 'webpack'

module.exports = merge<Configuration>(common as Configuration, {
  mode: 'production',

  plugins: [new Dotenv({ safe: true, path: 'staging.env' })],
})
