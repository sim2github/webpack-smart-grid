const loaderUtils = require('loader-utils')
const Liquid = require('shopify-liquid')
const path = require('path')

module.exports = function(content) {
  if (this.cacheable) this.cacheable()

  const config = loaderUtils.getOptions(this)
  const callback = this.async()
  const Engine = Liquid({
    root: path.resolve(__dirname, config.root) // for layouts and partials
  })

  return Engine.parseAndRender(content, config.data || {}).then(function(html) {
    return callback(null, html)
  })
}
