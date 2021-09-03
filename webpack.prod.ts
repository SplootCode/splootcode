import { Configuration } from "webpack";
import { merge } from 'webpack-merge';
import common from './webpack.common';
import Dotenv from 'dotenv-webpack'


module.exports = merge<Configuration>(common as Configuration, {
  mode: 'production',

  plugins: [
    new Dotenv({safe: true, path: 'production.env'})
  ],
});