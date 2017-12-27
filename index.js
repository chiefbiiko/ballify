#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var http = require('follow-redirects').http
var https = require('follow-redirects').https

var HELP = 'usage: ballify input [output]\n' +
  '  input: html file\n  output: output file name, default: ball.html'

var INPUT = process.argv[2]
var OUTPUT = process.argv[3] || 'ball.html'

var ROOT = path.dirname(path.join(process.cwd(), INPUT || ''))

var SCRIPTRGX = '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>'
var STYLERGX =
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
    res.on('data', chunks.push)
    res.on('end', function () {
      cb(null, chunks.map(String).join(''))
    })
  }).on('error', cb)
}

function httpspGet (url, cb) {
  https.get(url, function (res) {
    var chunks = []
    res.on('data', chunks.push)
    res.on('end', function () {
      cb(null, chunks.map(String).join(''))
    })
  }).on('error', cb)
}

function get (url, cb) {
  if (url.startsWith('https')) httpsGet(url, cb)
  else if (url.startsWith('http')) httpGet(url, cb)
  else cb(Error('unsupported resource'))
}

function read (file, cb) {
  if (fs.existsSync(file)) fs.readFile(file, 'utf8', cb)
  else get(file, cb)
}

function xhref (style) {
  return style.replace(/^.+href=.([^\s'"]+).+$/, '$1')
}

function xsrc (script) {
  return script.replace(/^.+src=.([^\s'"]+).+$/, '$1')
}

function xuri (element) {
  console.log(element)
  if (element.startsWith('<link')) return xhref(element)
  else if (element.startsWith('<script')) return xsrc(element)
  else throw Error('unsupported element')
}

function isStyle (element) {
  return element.startsWith('<link')
}

function maybeAbs (uri) {
  if (uri.startsWith('http')) return uri
  else if (!path.isAbsolute(uri)) return path.join(ROOT, uri)
  else return uri
}

if (!fs.existsSync(INPUT)) return console.error(HELP)

fs.readFile(INPUT, 'utf8', function (err, txt) {
  var styles = txt.match(RegExp(STYLERGX))
  var scripts = txt.match(RegExp(SCRIPTRGX))
  var pending = styles.length + scripts.length
  var out = txt

  scripts.concat(styles).forEach(function (element) {
    read(maybeAbs(xuri(element)), function (err, txt) {
      if (err) throw err
      var pac = isStyle(element) ? pacCSS(txt) : pacJS(txt)
      out = out.replace(element, pac)
      if (!--pending) console.log('DONE!\n' + out)
    })
  })

})
