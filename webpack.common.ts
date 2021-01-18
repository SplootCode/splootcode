import path from 'path'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'

export default {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  entry: {
    client: './src/index.tsx',
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
      },
      {
        test: /\.(svg)|(woff)|(woff2)|(eot)|(ttf)$/,
        use: ['file-loader']
      }
    ],
  },

  plugins: [
   
    new CopyWebpackPlugin([path.resolve('./static/index.html')]),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './static/index.html',
    }),
  ],

  devtool: 'cheap-module-source-map',
}
