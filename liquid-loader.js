/* eslint-disable valid-typeof */
/* eslint-disable no-prototype-builtins */
const loaderUtils = require('loader-utils')
const assign = require('object-assign')
const Liquid = require('shopify-liquid')
const path = require('path')
const Engine = Liquid({
  root: path.resolve(__dirname, 'src/pages/partials/') // for layouts and partials
})

function getLoaderConfig(context) {
  const query = loaderUtils.getOptions(context) || {}
  const configKey = query.config || 'liquid'
  const config =
    context.options && context.options.hasOwnProperty(configKey)
      ? context.options[configKey]
      : {}
  delete query.config
  return assign(query, config)
}

module.exports = function(content) {
  if (this.cacheable) this.cacheable()

  const config = getLoaderConfig(this)
  const callback = this.async()

  return Engine.parseAndRender(content, config.data || {}).then(function(html) {
    return callback(null, html)
  })
}

// module.exports.raw = true
