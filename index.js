// TODO:
//   + ~check whether links without rel="stylesheet" are actually css~
//   + ~print help on demand~
//   + ~test GET~
//   + separate api and cli
//   + ^implement GET against non-"https?" prefixed urls + test!
//   + ballify images: to base64?
//   + implement minifying scripts and styles and gzippin (add as cli args)
//   + ~write a test that shows that only empty scripts are considered~
//   + ~if input is not supplied look for index.html in cwd~

var fs = require('fs')
var path = require('path')
var http = require('follow-redirects').http
var https = require('follow-redirects').https
var getPixels = require('get-pixels')

var SCRIPTRGX = '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>'
var LINKRGX =
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)'
var IMGRGX = '<img[^>]+src=(?:"|\').+(?:"|\')[^>]*>'

function noop () {}

function pacCSS (css) {
  return '<style>' + css + '</style>'
}

function pacJS (js) {
  return '<script>' + js + '</script>'
}

function image2base64 (file, opts, cb) {
  getPixels(file, opts.mime, function (err, pix) {
    if (err) return cb(err)
    var src = 'data:image/*;base64,' + Buffer.from(pix.data).toString('base64')
    var img = '<img src="' + src + '" alt="base64-image">'
    cb(null, img)
  })
}

function getIt(mod, url, cb) {
  mod.get(url.startsWith('http') ? url : 'http://' + url, function (res) {
    var chunks = []
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.on('end', function () {
      cb(null, Buffer.concat(chunks))
    })
  }).on('error', cb)
}

function get (url, cb) {
  url.startsWith('https') ? getIt(https, url, cb) : getIt(http, url, cb)
}

function read (file, cb) {
  fs.existsSync(file) ? fs.readFile(file, cb) : get(file, cb)
}

function xhref (link) {
  return link.replace(/^.+href=.([^\s'"]+).+$/, '$1')
}

function xsrc (script) {
  return script.replace(/^.+src=.([^\s'"]+).+$/, '$1')
}

function xuri (element) {
  if (element.startsWith('<link')) return xhref(element)
  else if (element.startsWith('<script')) return xsrc(element)
}

function isLink (element) {
  return element.startsWith('<link')
}

function maybeAbs (uri, root) {
  if (uri.startsWith('http') || path.isAbsolute(uri)) return uri
  else if (!path.isAbsolute(uri)/*not url*/) return path.join(root, uri)
  else return uri
}

// opts: crunch-css=true, merge-css=true, uglify-js=true, img-base64=false,
//   crunch-html=false, gzip-ball=false
function ballify (input, opts, callback) {

  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  if (!opts) opts = {}
  if (!callback) callback = noop

  input = path.join(input || 'index.html')
  var root = path.dirname(path.join(__dirname, input))

  fs.readFile(input, 'utf8', function (err, txt) {
    if (err) callback(err)

    var all = txt.match(RegExp(SCRIPTRGX)).concat(txt.match(RegExp(LINKRGX)))
    var pending = all.length
    var out = txt

    all.forEach(function (element) {
      read(maybeAbs(xuri(element), root), function (err, buf) {
        if (err) callback(err)
        out = out.replace(element, isLink(element) ? pacCSS(buf) : pacJS(buf))
        if (!--pending) callback(null, out)
      })
    })

  })

}

module.exports = ballify
