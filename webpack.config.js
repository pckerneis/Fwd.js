const path = require('path');

module.exports = {
  entry: './src/runner/runner.ts',
  devtool: 'source-map',
  mode: 'development',
  optimization: {
    minimize: false
  },
  devServer: {
    writeToDisk: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js', '.html' ],
  },
  output: {
    filename: 'fwd-runner.js',
    path: path.resolve(__dirname, './static/lib'),
  },
};
