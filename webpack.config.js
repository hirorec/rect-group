const { resolve, join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');

module.exports = {
  mode: 'development',

  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: resolve(__dirname, 'dist'),
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['ts-loader'],
      },
      {
        test: /\.(|jpeg|jpg|png|gif|svg)$/i,
        use: [
          'file-loader?name=assets/images/[name].[ext]',
          // 'image-webpack-loader?bypassOnDebug&optipng.optimizationLevel=7&gifsicle.interlaced=false',
        ],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(glsl|frag|vert)$/i,
        use: ['glslify-import-loader', 'raw-loader', 'glslify-loader'],
      },
      {
        test: /\.scss$/i,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          { loader: 'css-loader' },
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                outputStyle: 'expanded',
              },
            },
          },
        ]
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '~': resolve(`${__dirname}/src`),
      '@': resolve(`${__dirname}/src`),
    },
  },
  plugins: [
    new ProgressBarPlugin(),
    new HtmlWebpackPlugin({
      template: `${__dirname}/src/index.html`,
      filename: 'index.html',
      inject: 'body',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'static', to: '' },
      ]
    }),
    new MiniCssExtractPlugin({
      filename: 'assets/css/style.css',
      ignoreOrder: true,
    })
  ],
  devServer: {
    hot: true,
    static: {
      directory: resolve(__dirname, "./"),
    },
    onBeforeSetupMiddleware: function (devServer) {
      const existsSync = (res, fileName) => {
        if (fs.existsSync(fileName)) {
          fs.readFile(fileName, (err, fileContents) => {
            if (err && err.code === 'ENOENT') {
              res.status(404).end();
              return;
            }
            res.end(fileContents);
          });
        } else {
          next();
        }
      }

      devServer.app.get('*.png|*.jpg|*.gif', (req, res, next) => {
        const result = new RegExp(`^/images/(.+$)`).test(req.originalUrl);

        if (result) {
          const fileName = join(__dirname, '/static/', req.originalUrl);
          existsSync(res, fileName)
        } else {
          next();
        }
      });
    },
  }
};
