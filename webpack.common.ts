import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import path from 'path'

export default {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  output: {
    path: path.resolve('dist'),
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
        use: 'ts-loader',
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
