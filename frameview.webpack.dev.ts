import Dotenv from 'dotenv-webpack'
import common from './frameview.webpack.common'
import { Configuration } from 'webpack'
import { Configuration as DevServerConfiguration } from 'webpack-dev-server'
import { merge } from 'webpack-merge'

interface Config extends Configuration {
  devServer?: DevServerConfiguration
}

module.exports = merge<Config>(common as Configuration, {
  mode: 'development',

  devServer: {
    port: 3001,
    hot: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-site',
    },
  },

  plugins: [new Dotenv({ safe: true, path: 'development.env' })],
})
