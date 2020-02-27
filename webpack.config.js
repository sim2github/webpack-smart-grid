const webpack = require('webpack')
const SGconf = require('smart-grid')
const path = require('path')
const glob = require('glob')
const csso = require('postcss-csso')
const autoprefixer = require('autoprefixer')
const mqpacker = require('css-mqpacker')
const sortCSSmq = require('sort-css-media-queries')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const chokidar = require('chokidar')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ImageminWebpWebpackPlugin = require('imagemin-webp-webpack-plugin')
const SpriteLoaderPlugin = require('svg-sprite-loader/plugin')
const TerserPlugin = require('terser-webpack-plugin')

let CONF = {
  entry: {
    main: 'src/main.js'
  },
  src: 'src',
  dist: 'build',
  clean: 'build',
  watch: ['src/pages/**/*.hbs'],
  pages: 'src/pages/*.hbs',
  data: 'src/pages/data.json',
  hbsOptions: {
    helperDirs: ['src/pages/helpers'],
    partialDirs: ['src/pages/partials']
  },
  copy: [
    {
      from: 'src/images',
      to: 'dist/images',
      type: 'dir'
    },
    // {
    //   from: 'src/fonts',
    //   to: 'dist/fonts',
    //   type: 'dir'
    // },
    {
      from: 'src/.nojekyll',
      to: 'dist/.nojekyll',
      type: 'file'
    },
    {
      from: 'src/favicon.ico',
      to: 'dist/favicon.ico',
      type: 'file'
    }
  ]
}

function absPath(obj, fn) {
  const handler = val => (typeof val === 'object' ? absPath(val, fn) : fn(val))
  if (Array.isArray(obj)) {
    return obj.map(handler)
  }
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((res, key) => {
      res[key] = handler(obj[key])
      return res
    }, {})
  }
  return obj
}

CONF = absPath(CONF, p => path.join(__dirname, p))

// eslint-disable-next-line no-unused-vars
module.exports = (_ = {}, argv) => {
  const isDEV =
    process.env.NODE_ENV === 'development' || argv.mode === 'development'

  const config = {
    mode: isDEV ? 'development' : 'production',
    devtool: isDEV ? 'inline-cheap-source-map' : 'none',
    context: CONF.src,
    entry: CONF.entry,
    output: {
      path: CONF.dist,
      filename: isDEV ? '[name].js' : '[name].[chunkhash].js'
    },
    watch: isDEV,
    devServer: {
      host: '0.0.0.0',
      port: 9090,
      overlay: true,
      before(app, server) {
        chokidar.watch(CONF.watch, {}).on('all', () => {
          server.sockWrite(server.sockets, 'content-changed')
        })
      }
    },
    resolve: {
      extensions: ['.js', '.json'],
      modules: [path.join(__dirname, 'node_modules'), CONF.src]
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          shared: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            enforce: true,
            chunks: 'all'
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
      const common = [
        new webpack.NamedModulesPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new CopyWebpackPlugin(CONF.copy),
        new ImageminWebpWebpackPlugin(),
        new SpriteLoaderPlugin()
      ]

      for (const file of glob.sync(CONF.pages)) {
        common.push(
          new HtmlWebpackPlugin({
            template: file,
            filename: path.join(CONF.dist, `${path.parse(file).name}.html`),
            inject: 'head',
            minify: !isDEV,
            templateParameters(compilation) {
              compilation.fileDependencies.add(CONF.data)
              delete require.cache[require.resolve(CONF.data)]
              return require(CONF.data)
            }
          })
        )
      }

      const production = [
        new MiniCssExtractPlugin({
          path: CONF.dist,
          filename: isDEV ? '[name].css' : '[name].[contenthash].css',
          chunkFilename: isDEV
            ? '[name].[id].css'
            : '[name].[id].[contenthash].css'
        }),
        new CleanWebpackPlugin(CONF.clean)
      ]

      const development = []

      return isDEV ? common.concat(development) : common.concat(production)
    })(),

    module: {
      rules: [
        {
          test: /\.hbs$/,
          loader: 'handlebars-loader',
          options: CONF.hbsOptions
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          query: {
            cacheDirectory: true
          }
        },
        {
          test: /\.s?css$/,
          use: [
            isDEV ? 'style-loader?sourceMap=true' : MiniCssExtractPlugin.loader,
            `css-loader?sourceMap=${isDEV}`,
            {
              loader: 'postcss-loader',
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
                  ]
                }
              }
            },
            `sass-loader?sourceMap=${isDEV}`
          ]
        },
        {
          test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?(\?[\s\S]+)?$/,
          use:
            'file-loader?name=[name].[ext]&outputPath=fonts/&publicPath=/fonts/'
        },
        {
          test: /\.(jpe?g|png|gif)$/i,
          use: [
            'file-loader?name=images/[name].[ext]',
            {
              loader: 'image-webpack-loader',
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
                  quality: '65-90',
                  speed: 4
                },
                gifsicle: {
                  interlaced: false
                }
              }
            }
          ]
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'svg-sprite-loader',
              options: {
                extract: true,
                spriteFilename: 'sprite.svg'
              }
            },
            'svgo-loader'
          ]
        }
      ]
    }
  }

  return config
}
