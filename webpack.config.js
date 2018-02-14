const path = require('path');
const { HotModuleReplacementPlugin } = require('webpack');

module.exports = {
  resolve: {
    extensions: ['.ts', '.js']
  },
  entry: './src/heart.ts',
  output: {
    filename: 'heart.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  module: {
    rules: [{ test: /\.ts?$/, loader: 'ts-loader' }]
  },
  devServer: {
    port: 3000,
    contentBase: path.join(__dirname, 'src'),
    stats: {
      assets: false,
      hash: false,
      chunks: false,
      errors: true,
      errorDetails: true
    },
    overlay: true,
    hot: true,
    inline: true
  },
  plugins: [new HotModuleReplacementPlugin()]
};
