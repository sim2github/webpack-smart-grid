const webpack = require("webpack"),
  sgConf = require("smart-grid"),
  path = require("path"),
  csso = require("postcss-csso"),
  autoprefixer = require("autoprefixer"),
  mqpacker = require("css-mqpacker"),
  sortCSSmq = require("sort-css-media-queries"),
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  HtmlWebpackPlugin = require("html-webpack-plugin"),
  CleanWebpackPlugin = require("clean-webpack-plugin"),
  MiniCssExtractPlugin = require("mini-css-extract-plugin"),
  TerserPlugin = require("terser-webpack-plugin"),
  AssetsPlugin = require("assets-webpack-plugin");

const paths = {
  src: path.join(__dirname, "src"),
  dist: path.join(__dirname, "dist")
};

module.exports = (env = {}, argv) => {
  const isDev =
    process.env.NODE_ENV === "development" || argv.mode === "development";

  let config = {
    mode: isDev ? "development" : "production",
    devtool: isDev ? "inline-cheap-source-map" : "none",
    context: paths.src,
    entry: {
      main: "./main.js"
    },
    output: {
      path: paths.dist,
      filename: isDev ? "[name].js" : "[name].[chunkhash].js"
    },
    watch: isDev,
    devServer: {
      host: "0.0.0.0",
      port: 9000
    },
    resolve: {
      extensions: [".js", ".json"],
      modules: [path.join(__dirname, "node_modules"), paths.src]
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          shared: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            enforce: true,
            chunks: "all"
          }
        }
      },
      minimize: !isDev,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            ecma: 6
          }
        })
      ]
    },
    plugins: (() => {
      let common = [
        new webpack.NamedModulesPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new AssetsPlugin({
          path: paths.dist,
          filename: "manifest.json",
          prettyPrint: true,
          includeManifest: true,
          manifestFirst: true
        }),
        new CleanWebpackPlugin([paths.dist]),
        new CopyWebpackPlugin([
          {
            from: path.join(paths.src, "images"),
            to: path.join(paths.dist, "images"),
            type: "dir"
          },
          {
            from: path.join(paths.src, "fonts"),
            to: path.join(paths.dist, "fonts"),
            type: "dir"
          },
          {
            from: path.join(paths.src, "favicon.ico"),
            to: path.join(paths.dist, "favicon.ico"),
            type: "file"
          }
        ]),
        new HtmlWebpackPlugin({
          template: path.join(paths.src, "index.html"),
          minify: isDev
            ? undefined
            : {
                removeComments: true,
                collapseWhitespace: true,
                removeAttributeQuotes: true
              }
        })
      ];

      const production = [
        new MiniCssExtractPlugin({
          path: paths.dist,
          filename: isDev ? "[name].css" : "[name].[contenthash].css",
          chunkFilename: isDev
            ? "[name].[id].css"
            : "[name].[id].[contenthash].css"
        })
      ];

      const development = [];

      return isDev ? common.concat(development) : common.concat(production);
    })(),

    module: {
      rules: [
        {
          test: /\.html$/,
          loader: "mustache-loader",
          options: {
            tiny: true,
            render: {
              title: "Flat Grid"
            }
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "babel-loader",
          query: {
            cacheDirectory: true
          }
        },
        {
          test: /\.s?css$/,
          use: [
            isDev ? "style-loader?sourceMap=true" : MiniCssExtractPlugin.loader,
            `css-loader?sourceMap=${isDev}`,
            {
              loader: "postcss-loader",
              options: {
                sourceMap: isDev,
                plugins() {
                  return [
                    csso,
                    autoprefixer,
                    mqpacker({
                      sort: sgConf.mobileFirst
                        ? sortCSSmq
                        : sortCSSmq.desktopFirst
                    })
                  ];
                }
              }
            },
            `sass-loader?sourceMap=${isDev}`
          ]
        },
        {
          test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?(\?[\s\S]+)?$/,
          use:
            "file-loader?name=[name].[ext]&outputPath=fonts/&publicPath=/fonts/"
        },
        {
          test: /\.(jpe?g|png|gif)$/i,
          use: [
            "file-loader?name=images/[name].[ext]",
            {
              loader: "image-webpack-loader",
              options: {
                bypassOnDebug: true,
                mozjpeg: {
                  progressive: true,
                  quality: 65
                },
                optipng: {
                  enabled: true
                },
                pngquant: {
                  quality: "65-90",
                  speed: 4
                },
                gifsicle: {
                  interlaced: false
                },
                webp: {
                  quality: 75
                }
              }
            }
          ]
        }
      ]
    }
  };

  return config;
};
