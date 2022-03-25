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

  output: {
    path: path.resolve('dist'),
    publicPath: '/',
    filename: '[name]-[contenthash].js',
    clean: true,
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
      {
        test: /\.(svg)|(woff)|(woff2)|(eot)|(ttf)$/,
        use: ['file-loader'],
      },
    ],
  },

  plugins: [
    new NodePolyfillPlugin(),
    new CopyWebpackPlugin({ patterns: [path.resolve('./static/**')] }),
    new HtmlWebpackPlugin({
      template: './static/index.html',
    }),
  ],

  devtool: 'cheap-module-source-map',
}
