import path from 'path'
import webpackMerge from 'webpack-merge';
import common from './frameview.webpack.common';
import Dotenv from 'dotenv-webpack'

module.exports = webpackMerge(common, {
  mode: 'development',

  output: {
    path: path.resolve('dev-frame-dist'),
    filename: '[name].js',
  },

  devServer: {
    port: 3001,
    hot: false,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-site",
    }
  },

  plugins: [
    new Dotenv({safe: true, path: 'development.env'})
  ],
});