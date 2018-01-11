// TODO:
//   + ~also ballify google fonts that are loaded into the webpage!!!~
//   + ~whatabout gif tiff bmp?!~
//   + ~implement opts - minification!!!~
//   + ~separate api and cli~
//   + ~consider svgs when looking for images~
//   + ~ballify images inclluded in css! to base64~
//   + ~check whether links without rel="stylesheet" are actually css~
//   + ~print help on demand~
//   + ~test GET~
//   + ~implement GET against non-"https?" prefixed urls + test!~
//   + ~ballify images: to base64? - ALSO WITHIN js !!!~
//   + ~write a test that shows that only empty scripts are considered~
//   + ~if input is not supplied look for index.html in cwd~

var fs = require('fs')
var path = require('path')
var zlib = require('zlib')
var http = require('follow-redirects').http
var https = require('follow-redirects').https
var ugly = require('uglify-es')
var urlRGX = require('url-regex')
var crunchifyCSS = require('./crunchify-css/index')

var NEWLINE = RegExp('\\n', 'g')
var FILE_EXTENSION = RegExp('^.+\\.(.+)$')
var IMG_EXTENSIONS = RegExp('(?:jpg|jpeg|png|svg|gif)$', 'i')
var SVG_EXTENSION = RegExp('\\.svg$', 'i')
var ALT_ATTR = RegExp('^.+alt=(?:"|\')([^"\']+)(?:"|\').+$')
var ENDS_PUNCTUATION = RegExp('^[("\']|[)"\']$', 'g')
var IMG_NAME_JS = RegExp(
  '^.*(?:"|\')(.+\\.(?:jpg|jpeg|png|svg|gif))(?:"|\').*$', 'i'
)
var FILE_NAME_CSS = RegExp(
  '^.*url\\(\\s*(?:"|\')?(.+\\.(?:jpg|jpeg|png|svg|gif|ttf|woff2?))' +
  '(?:"|\')?\\s*\\).*$', 'i'
)
var IMG_SRCS_CSS = RegExp(
  'url\\(\\s*(?:"|\')?.+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')?\\s*\\)', 'g'
)
var SCRIPTS = RegExp(
  '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>', 'g'
)
var IMGS = RegExp(
  '<img[^>]+src=(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')[^>]*>', 'g'
)
var CSS_LINKS = RegExp(
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+\\.css(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+\\.css(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)', 'g'
)
var GOOGLE_FONT_LINKS = RegExp(
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+fonts\\.googleapis.+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+fonts\\.googleapis.+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)', 'g'
)
var IDL_SRCS_JS = RegExp(
  '[^\\d\\s][^\\s]{1,}\\.src\\s*=\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')', 'g'
)
var SET_SRCS_JS = RegExp(
  '[^\\d\\s][^\\s]{1,}\.setAttribute\\(\\s*(?:"|\')src(?:"|\'),\\s*(?:"|\')' +
  '.+\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')\\s*\\)', 'g'
)

function noop () {}

function isBool (x) {
  return x === false || x === true
}

function problyMinified (code) {
  return (code.match(NEWLINE) || []).length < (code.length / 160)
}

function pacCSS (css, opts) {
  if (opts && opts.minifyCSS) css = crunchifyCSS(css, opts)
  return '<style>' + css + '</style>'
}

function pacJS (js, opts) { // hopefully not minified yet
  if (opts && opts.uglifyJS && !problyMinified(js)) js = ugly.minify(js).code
  return '<script>' + js + '</script>'
}

function buf2Base64DataUri (buf, url) {
  var media = IMG_EXTENSIONS.test(url) ? 'image' : 'font'
  var type
  if (SVG_EXTENSION.test(url)) type = 'svg+xml'
  else if (media === 'font') type = xext(url)
  else type = '*'
  return 'data:' + media + '/' + type + ';base64,' + buf.toString('base64')
}

function buf2Base64Img (buf, url, alt) {
  return '<img src="' + buf2Base64DataUri(buf, url) + '" alt="' + alt + '">'
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

function xsrc (scr) {
  return scr.replace(/^.+src=.([^\s'"]+).+$/, '$1')
}

function xyzsrc (stmt) {
  if (urlRGX().test(stmt)) {
    return stmt.match(urlRGX())[0].replace(ENDS_PUNCTUATION, '')
  } else {
    return stmt.replace(/url\(/.test(stmt) ? FILE_NAME_CSS : IMG_NAME_JS, '$1')
  }
}

function xext (url) {
  return url.replace(FILE_EXTENSION, '$1')
}

function xurl (el) {
  if (isCSSLink(el) || isGoogleFontLink(el)) return xhref(el)
  else if (isImg(el) || isScript(el)) return xsrc(el)
  else return xyzsrc(el)
}

function xalt (img) {
  return img.replace(ALT_ATTR, '$1')
}

function isImg (el) {
  return el.startsWith('<img')
}

function isScript (el) {
  return el.startsWith('<script')
}

function isCSSLink (el) {
  return el.startsWith('<link') && /\.css/.test(el)
}

function isGoogleFontLink (el) {
  return el.startsWith('<link') && /fonts\.googleapis/.test(el)
}

function maybeAbs (url, root) { // magic 36 to make sure its not a url
  if (url.startsWith('http') || path.isAbsolute(url)) return url
  else if (!urlRGX().test(url) && url.length < 36) return path.join(root, url)
  else return url
}

function imgSrc2Base64ThenPac (buf, el, origin, opts, cb) {
  var txt = buf.toString()
  var isCSS = isCSSLink(el)
  var all
  if (isCSS) all = txt.match(IMG_SRCS_CSS) || []
  else all = (txt.match(IDL_SRCS_JS) || []).concat(txt.match(SET_SRCS_JS) || [])
  var pending = all.length

  if (!opts.base64Images || !pending) {
    return cb(null, isCSS ? pacCSS(txt, opts) : pacJS(txt, opts))
  }

  all.forEach(function (stmt) {
    var src = xurl(stmt)
    var url = maybeAbs(src, path.dirname(origin))
    read(url, function (err, imgbuf) {
      if (err) return cb(err)
      txt = txt.replace(src, buf2Base64DataUri(imgbuf, url))
      if (!--pending) cb(null, isCSS ? pacCSS(txt, opts) : pacJS(txt, opts))
    })
  })

}

function getThenPacThatGoogleFont (buf, opts, cb) {
  var fontface = buf.toString()
  var url = xurl(fontface)
  var ext = xext(url)
  read(url, function (err, buf) {
    if (err) return cb(err)
    cb(null, pacCSS(fontface.replace(url, buf2Base64DataUri(buf, url)), opts))
  })
}

function ballify (index, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  if (!callback) callback = noop
  if (!opts) opts = {}

  var _opts = {}
  _opts.gzip = isBool(opts.gzip) ? opts.gzip : true
  _opts.base64Images = isBool(opts.base64Images) ? opts.base64Images : true
  _opts.uglifyJS = isBool(opts.uglifyJS) ? opts.uglifyJS : true
  _opts.minifyCSS = isBool(opts.minifyCSS) ? opts.minifyCSS : true
  _opts.merge = isBool(opts.mergeCSS) ? opts.mergeCSS : true
  _opts.crunchHTML = isBool(opts.crunchHTML) ? opts.crunchHTML : true
  _opts.base64GoogleFonts = isBool(opts.base64GoogleFonts)
    ? opts.base64GoogleFonts : true

  index = path.join(index || 'index.html')
  var root = path.dirname(path.join(__dirname, index))

  fs.readFile(index, 'utf8', function (err, txt) {
    if (err) return callback(err)

    function done (el, err, pac) {
      if (err) return callback(err)
      txt = txt.replace(el, pac)
      if (!--pending) {
        if (_opts.crunchHTML) txt = txt.replace(/>\s+</g, '><').trim()
        if (_opts.gzip) return zlib.gzip(Buffer.from(txt), callback)
	      callback(null, Buffer.from(txt))
      }
    }

    var all = (txt.match(SCRIPTS) || []).concat(txt.match(CSS_LINKS) || [])

    if (_opts.base64Images) all = all.concat(txt.match(IMGS) || [])
    if (_opts.base64GoogleFonts) all = all.concat(txt.match(GOOGLE_FONT_LINKS) || [])

    var pending = all.length

    if (!pending) return callback(null, txt)

    all.forEach(function (el) {
      var url = maybeAbs(xurl(el), root)
      read(url, function (err, buf) {
        if (err) return callback(err)
        if (isScript(el) || isCSSLink(el)) {
          imgSrc2Base64ThenPac(buf, el, url, _opts, done.bind(null, el))
        } else if (isImg(el)) {
          done(el, null, buf2Base64Img(buf, url, xalt(el)))
        } else if (isGoogleFontLink(el)) {
          getThenPacThatGoogleFont(buf, _opts, done.bind(null, el))
        }
      })
    })

  })

}

module.exports = ballify
