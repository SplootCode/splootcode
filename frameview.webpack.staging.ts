import path from 'path'
import webpackMerge from 'webpack-merge';
import common from './frameview.webpack.common';
import Dotenv from 'dotenv-webpack'

module.exports = webpackMerge(common, {
  mode: 'production',

  output: {
    path: path.resolve('frame-dist'),
    filename: '[name]-[contenthash].js',
  },

  plugins: [
    new Dotenv({safe: true, path: 'staging.env'})
  ],
});