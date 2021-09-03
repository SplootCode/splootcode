import path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

export default {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  output: {
    path: path.resolve('frame-dist'),
    filename: '[name]-[contenthash].js',
    clean: true,
  },

  mode: process.env.NODE_ENV || 'development',

  entry: {
    splootframeclient: './src/view/index.tsx',
    splootframepythonclient: './src/view/python.tsx',
    serviceworker: {
      import: './src/serviceworker/serviceworker.ts',
      filename: 'sw.js' // Service worker needs a consistent file name.
    }
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
    new NodePolyfillPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        path.resolve('./static_frame/**'),
      ]
    }),
    new HtmlWebpackPlugin({
      template: './src/view/splootframeclient.html',
      filename: 'splootframeclient.html',
      excludeChunks: ['splootframepythonclient']
    }),
    new HtmlWebpackPlugin({
      template: './src/view/splootframepythonclient.html',
      filename: 'splootframepythonclient.html',
      excludeChunks: ['splootframeclient']
    })
  ],

  devtool: 'cheap-module-source-map',
}
