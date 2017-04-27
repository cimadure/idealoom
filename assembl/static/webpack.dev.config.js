var path = require('path'),
    glob = require('glob'),
    webpack = require('webpack'),
    _ = require('underscore'),
    ExtractTextPlugin = require("extract-text-webpack-plugin"),
    base_config = require('./webpack.config.js'),
    webpackHost = process.env.WEBPACK_URL.split('://')[1].split(':')[0],
    webpack_port = parseInt(process.env.WEBPACK_URL.split(':')[2]);

base_config.entry.main = [
  'webpack-dev-server/client?'+process.env.WEBPACK_URL,
  'webpack/hot/only-dev-server',
  './js/app/index.js',
];

module.exports = _.extend(base_config, {
  devServer: {
    hot: true,
    inline: true,
    headers: {
        "Access-Control-Allow-Origin": process.env.ASSEMBL_URL,
        "Access-Control-Allow-Credentials":true
    },
    port: webpack_port,
    host: webpackHost,
  },
  plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.ResolverPlugin(
        new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('../../bower.json', ['main'])
      ),
      new webpack.optimize.CommonsChunkPlugin({
        names: ['infrastructure', 'manifest'] // Specify the common bundle's name.
      }),
      new ExtractTextPlugin("[name].css"),
  ],
  sassLoader: {
    data: '$static_url: "~/";',
  },
});
