import path from 'path'
import webpackMerge from 'webpack-merge';
import common from './webpack.common';
import Dotenv from 'dotenv-webpack'


module.exports = webpackMerge(common, {
  mode: 'development',

  devServer: {
    port: 3000,
    hot: true,
  },

  output: {
    path: path.resolve('dev-dist'),
    filename: '[name].js',
  },

  plugins: [
    new Dotenv({safe: true, path: 'development.env'})
  ],
});