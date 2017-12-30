#!/usr/bin/env node

// TODO:
//   + ~check whether links without rel="stylesheet" are actually css~
//   + print help on demand
//   + ~test GET~
//   + implement GET against non-"https?" prefixed urls
//   + implement minifying and gzippin scripts and styles (add as cli args)
//   + write a test that shows that only empty scripts are considered
//   + if input is not supplied look for index.html in cwd

var fs = require('fs')
var path = require('path')
var http = require('follow-redirects').http
var https = require('follow-redirects').https

var HELP = 'usage: ballify input [output]\n' +
  '  input: html file\n  output: output file name, default: ball.html'

var INPUT = process.argv[2] ? path.join(process.argv[2]) : ''
var OUTPUT = path.join(process.argv[3] || 'ball.html')
var ROOT = path.dirname(path.join(process.cwd(), INPUT))

var SCRIPTRGX = '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>'
var STYLERGX =
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)'

function thrower (err) {
  if (err) throw err
}

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
  }).on('error', thrower)
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
  }).on('error', thrower)
}

function get (url, cb) {
  if (url.startsWith('https')) httpsGet(url, cb)
  else if (url.startsWith('http')) httpGet(url, cb)
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
  else throw Error('unsupported element')
}

function isLink (element) {
  return element.startsWith('<link')
}

function maybeAbs (uri) {
  if (uri.startsWith('http')) return uri
  else if (!path.isAbsolute(uri)) return path.join(ROOT, uri)
  else return uri
}

function done (out) {
  fs.writeFile(OUTPUT, out, function (err) {
    if (err) throw err
    console.log('DONE!\n' + OUTPUT)
  })
}

fs.readFile(INPUT, 'utf8', function (err, txt) {
  var all = txt.match(RegExp(SCRIPTRGX)).concat(txt.match(RegExp(STYLERGX)))
  var pending = all.length
  var out = txt

  all.forEach(function (element) {
    read(maybeAbs(xuri(element)), function (err, txt) {
      if (err) throw err
      out = out.replace(element, isLink(element) ? pacCSS(txt) : pacJS(txt))
      if (!--pending) done(out)
    })
  })

})
