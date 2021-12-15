import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import path from 'path'

export default {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [new TsconfigPathsPlugin({})],
  },

  context: __dirname,

  output: {
    path: path.resolve('frame-dist'),
    filename: '[name]-[contenthash].js',
    clean: true,
  },

  mode: process.env.NODE_ENV || 'development',

  entry: {
    splootframepythonclient: {
      import: './packages/runtime-python/runtime/index.tsx',
    },
    python_webworker: {
      import: './packages/runtime-python/runtime/webworker.js',
      filename: 'runtime-python/webworker.js',
    },
    splootframewebclient: {
      import: './packages/runtime-web/index.ts',
    },
    web_serviceworker: {
      import: './packages/runtime-web/serviceworker.ts',
      filename: 'sw.js', // Service worker needs a consistent file name.
    },
  },

  optimization: {
    runtimeChunk: false,
    splitChunks: {
      chunks(chunk) {
        return false
      },
    },
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            projectReferences: true,
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },

  plugins: [
    new NodePolyfillPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve('node_modules', '@splootcode', 'runtime-python', 'static'),
          to: 'runtime-python/static',
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/template.html',
      filename: 'splootframewebclient.html',
      chunks: ['splootframewebclient'],
    }),
    new HtmlWebpackPlugin({
      template: './src/template.html',
      filename: 'splootframepythonclient.html',
      chunks: ['splootframepythonclient'],
    }),
  ],

  devtool: 'cheap-module-source-map',
}
