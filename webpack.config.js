const webpack = require("webpack"),
  SGconf = require("smart-grid"),
  path = require("path"),
  glob = require("glob"),
  csso = require("postcss-csso"),
  autoprefixer = require("autoprefixer"),
  mqpacker = require("css-mqpacker"),
  sortCSSmq = require("sort-css-media-queries"),
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  chokidar = require("chokidar"),
  HtmlWebpackPlugin = require("html-webpack-plugin"),
  CleanWebpackPlugin = require("clean-webpack-plugin"),
  MiniCssExtractPlugin = require("mini-css-extract-plugin"),
  ImageminWebpWebpackPlugin = require("imagemin-webp-webpack-plugin"),
  TerserPlugin = require("terser-webpack-plugin");

let CONF = {
  entry: {
    main: "src/main.js"
  },
  src: "src",
  dist: "dist",
  clean: "dist",
  watch: ["src/pages/**/*.hbs"],
  pages: "src/pages/*.hbs",
  data: "src/pages/data.json",
  hbsOptions: {
    helperDirs: ["src/pages/helpers"],
    partialDirs: ["src/pages/partials"]
  },
  copy: [
    {
      from: "src/images",
      to: "dist/images",
      type: "dir"
    },
    {
      from: "src/fonts",
      to: "dist/fonts",
      type: "dir"
    },
    {
      from: "src/favicon.ico",
      to: "dist/favicon.ico",
      type: "file"
    }
  ]
};

function absPath(obj, fn) {
  const handler = val => (typeof val === "object" ? absPath(val, fn) : fn(val));
  if (Array.isArray(obj)) {
    return obj.map(handler);
  }
  if (typeof obj === "object") {
    return Object.keys(obj).reduce((res, key) => {
      res[key] = handler(obj[key]);
      return res;
    }, {});
  }
  return obj;
}

CONF = absPath(CONF, p => path.join(__dirname, p));

module.exports = (env = {}, argv) => {
  const isDEV =
    process.env.NODE_ENV === "development" || argv.mode === "development";

  let config = {
    mode: isDEV ? "development" : "production",
    devtool: isDEV ? "inline-cheap-source-map" : "none",
    context: CONF.src,
    entry: CONF.entry,
    output: {
      path: CONF.dist,
      filename: isDEV ? "[name].js" : "[name].[chunkhash].js"
    },
    watch: isDEV,
    devServer: {
      host: "0.0.0.0",
      port: 9000,
      overlay: true,
      before(app, server) {
        chokidar.watch(CONF.watch, {}).on("all", () => {
          server.sockWrite(server.sockets, "content-changed");
        });
      }
    },
    resolve: {
      extensions: [".js", ".json"],
      modules: [path.join(__dirname, "node_modules"), CONF.src]
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
      minimize: !isDEV,
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
        new CleanWebpackPlugin(CONF.clean),
        new CopyWebpackPlugin(CONF.copy),
        new ImageminWebpWebpackPlugin()
      ];
      for (let file of glob.sync(CONF.pages)) {
        common.push(
          new HtmlWebpackPlugin({
            template: file,
            filename: path.join(CONF.dist, path.parse(file).name + ".html"),
            inject: "head",
            minify: isDEV ? false : true,
            templateParameters(compilation) {
              compilation.fileDependencies.add(CONF.data);
              delete require.cache[require.resolve(CONF.data)];
              return require(CONF.data);
            }
          })
        );
      }

      const production = [
        new MiniCssExtractPlugin({
          path: CONF.dist,
          filename: isDEV ? "[name].css" : "[name].[contenthash].css",
          chunkFilename: isDEV
            ? "[name].[id].css"
            : "[name].[id].[contenthash].css"
        })
      ];

      const development = [];

      return isDEV ? common.concat(development) : common.concat(production);
    })(),

    module: {
      rules: [
        {
          test: /\.hbs$/,
          loader: "handlebars-loader",
          options: CONF.hbsOptions
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
            isDEV ? "style-loader?sourceMap=true" : MiniCssExtractPlugin.loader,
            `css-loader?sourceMap=${isDEV}`,
            {
              loader: "postcss-loader",
              options: {
                sourceMap: isDEV,
                plugins() {
                  return [
                    csso,
                    autoprefixer,
                    mqpacker({
                      sort: SGconf.mobileFirst
                        ? sortCSSmq
                        : sortCSSmq.desktopFirst
                    })
                  ];
                }
              }
            },
            `sass-loader?sourceMap=${isDEV}`
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
