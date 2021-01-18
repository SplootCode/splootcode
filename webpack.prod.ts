import path from 'path'
import webpackMerge from 'webpack-merge';
import common from './webpack.common';
import Dotenv from 'dotenv-webpack'

module.exports = webpackMerge(common, {
  mode: 'production',

  output: {
    path: path.resolve('dist'),
    filename: '[name]-[contenthash].js',
  },

  plugins: [
    new Dotenv({safe: true, path: 'production.env'})
  ],
});