import path from 'path'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ServiceWorkerWebpackPlugin from 'serviceworker-webpack-plugin';


export default {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  mode: process.env.NODE_ENV || 'development',

  entry: {
    splootframeclient: './src/view/index.tsx',
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader','css-loader']
      }
    ],
  },

  plugins: [
    new ServiceWorkerWebpackPlugin({
      entry: path.join(__dirname, 'src/serviceworker/serviceworker.ts'),
    }),
    new CopyWebpackPlugin([path.resolve('./src/view/splootframeclient.html')]),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/view/splootframeclient.html',
      filename: 'splootframeclient.html'
    }),
  ],

  devtool: 'cheap-module-source-map',
}
