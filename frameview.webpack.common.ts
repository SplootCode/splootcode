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
    splootframewebclient: {
      import: '@splootcode/runtime-web/runtime/index.tsx'
    },
    web_serviceworker: {
      import: '@splootcode/runtime-web/runtime/serviceworker/serviceworker.ts',
      filename: 'sw.js' // Service worker needs a consistent file name.
    },
    splootframepythonclient: {
      import: '@splootcode/runtime-python/runtime/index.tsx'
    },
    python_webworker: {
      import: '@splootcode/runtime-python/runtime/webworker.js',
      filename: 'runtime-python/webworker.js'
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
        {
          from: path.resolve('node_modules', '@splootcode', 'runtime-python', 'static'), 
          to: 'runtime-python/static'
        }
      ]
    }),
    new HtmlWebpackPlugin({
      template: './src/template.html',
      filename: 'splootframewebclient.html',
      chunks: ['splootframewebclient']
    }),
    new HtmlWebpackPlugin({
      template: './src/template.html',
      filename: 'splootframepythonclient.html',
      chunks: ['splootframepythonclient']
    })
  ],

  devtool: 'cheap-module-source-map',
}
