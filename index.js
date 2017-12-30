#!/usr/bin/env node

// TODO:
//   + ~check whether links without rel="stylesheet" are actually css~
//   + ~print help on demand~
//   + ~test GET~
//   + separate api and cli
//   + ~implement GET against non-"https?" prefixed urls~
//   + ballify images: to base64?
//   + implement minifying scripts and styles and gzippin (add as cli args)
//   + ~write a test that shows that only empty scripts are considered~
//   + ~if input is not supplied look for index.html in cwd~


var fs = require('fs')
var path = require('path')
var http = require('follow-redirects').http
var https = require('follow-redirects').https

// var ROOT = path.dirname(path.join(process.cwd(), INPUT))

var SCRIPTRGX = '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>'
var LINKRGX =
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)'

function pacCSS (css) {
  return '<style>' + css + '</style>'
}

function pacJS (js) {
  return '<script>' + js + '</script>'
}

function httpGet (url, cb) {
  http.get(url, function (res) {
    var chunks = []
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.on('end', function () {
      cb(null, chunks.map(String).join(''))
    })
  }).on('error', cb)
}

function httpsGet (url, cb) {
  https.get(url, function (res) {
    var chunks = []
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.on('end', function () {
      cb(null, chunks.map(String).join(''))
    })
  }).on('error', cb)
}

function get (url, cb) {
  url.startsWith('https') ? httpsGet(url, cb) : httpGet(url, cb)
}

function read (file, cb) {
  if (fs.existsSync(file)) fs.readFile(file, 'utf8', cb)
  else if (file.startsWith('http')) get(file, cb)
  else cb(Error('unsupported resource'))
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
  if (uri.startsWith('http')) return uri
  else if (!path.isAbsolute(uri)) return path.join(root, uri)
  else return uri
}

// opts: --crunch-css=true, --merge-css=true, --uglify-js=true,
//   --crunch-html=false, --gzip-ball=false
function ballify (input, opts, callback) {

  input = path.join(input || 'index.html')
  opts = opts || {}

  var root = path.dirname(path.join(__dirname, input))

  fs.readFile(input, 'utf8', function (err, txt) {
    if (err) callback(err)

    var all = txt.match(RegExp(SCRIPTRGX)).concat(txt.match(RegExp(LINKRGX)))
    var pending = all.length
    var out = txt

    all.forEach(function (element) {
      read(maybeAbs(xuri(element), root), function (err, txt) {
        if (err) callback(err)

        out = out.replace(element, isLink(element) ? pacCSS(txt) : pacJS(txt))

        if (!--pending) callback(null, out)
      })
    })

  })

}

module.exports = ballify
