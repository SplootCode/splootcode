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
    hot: true,
    contentBase: path.join(__dirname, 'dev-frame-dist'),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  },

  plugins: [
    new Dotenv({safe: true, path: 'development.env'})
  ],
});