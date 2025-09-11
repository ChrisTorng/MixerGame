const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      filename: isProduction ? 'bundle.min.js' : 'bundle.js',
      path: path.resolve(__dirname, 'dist')
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    devServer: {
      static: {
        // Serve static assets (index.html, index.css) from / not /src during dev
        directory: __dirname,
      },
      compress: true,
      port: 9000,
    },
    watch: !isProduction,
  };
};
