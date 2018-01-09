// TODO:
//   + also ballify fonts that are loaded into the webpage!!!
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
var valid = require('valid-url')
var ugly = require('uglify-es')
var crunchifyCSS = require('./crunchify-css/index')

var XRGX = RegExp('^.*(?:"|\')(.+\\.(?:jpg|jpeg|png|svg|gif))(?:"|\').*$', 'i')
var CSSRGX = RegExp(
  'url\\(\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')\\s*\\)', 'g'
)
var SCRIPTRGX = RegExp(
  '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>', 'g'
)
var IMGRGX = RegExp(
  '<img[^>]+src=(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')[^>]*>', 'g'
)
var LINKRGX = RegExp(
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)', 'g'
)
var IDLRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\\.src\\s*=\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')', 'g'
)
var SETRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\.setAttribute\\(\\s*(?:"|\')src(?:"|\'),\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG|gif|GIF)(?:"|\')\\s*\\)', 'g'
)

function noop () {}

function isBool (x) {
  return x === false || x === true
}

function problyUnminified (js) {
  // var CMTRGX = /(?:\/\/|\/\*.*\*\/)/
  var N = (js.match(/\n/g) || []).length
  return !(N < (js.length / 160))// || CMTRGX.test(js)
}

function pacCSS (css, opts) {
  if (opts && opts.crunchifyCSS) css = crunchifyCSS(css, opts)
  return '<style>' + css + '</style>'
}

function pacJS (js, opts) { // hopefully not minified yet
  if (opts && opts.uglifyJS && problyUnminified(js)) js = ugly.minify(js).code
  return '<script>' + js + '</script>'
}

function buf2Base64ImgDataUri (buf, url) {
  var type = /\.svg$/i.test(url) ? 'svg+xml' : '*'
  return 'data:image/' + type + ';base64,' + buf.toString('base64')
}

function buf2Base64Img (buf, url) {
  return '<img src="' + buf2Base64ImgDataUri(buf, url) + '" alt="base64-img">'
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
  return stmt.replace(XRGX, '$1')
}

function xurl (el) {
  if (isLink(el)) return xhref(el)
  else if (isImg(el) || isScript(el)) return xsrc(el)
  else return xyzsrc(el)
}

function isImg (el) {
  return el.startsWith('<img')
}

function isScript (el) {
  return el.startsWith('<script')
}

function isLink (el) {
  return el.startsWith('<link')
}

function maybeAbs (url, root) { // magic 36 to make sure its not a url
  if (url.startsWith('http') || path.isAbsolute(url)) return url
  else if (!valid.isUri(url) && url.length < 36) return path.join(root, url)
  else return url
}

function imgSrc2Base64ThenPac (buf, el, origin, opts, cb) {
  var txt = buf.toString()
  var isCSS = isLink(el)
  var all
  if (isCSS) all = txt.match(CSSRGX) || []
  else all = (txt.match(IDLRGX) || []).concat(txt.match(SETRGX) || [])
  var pending = all.length

  if (!opts.base64Images || !pending) {
    return cb(null, isCSS ? pacCSS(txt, opts) : pacJS(txt, opts))
  }

  all.forEach(function (stmt) {
    var src = xurl(stmt)
    var url = maybeAbs(src, path.dirname(origin))
    read(url, function (err, imgbuf) {
      if (err) return cb(err)
      txt = txt.replace(src, buf2Base64ImgDataUri(imgbuf, url))
      if (!--pending) {
        cb(null, isCSS ? pacCSS(txt, opts) : pacJS(txt, opts))
      }
    })
  })

}

// opts: crunchifyCSS: true, mergeCSS: true, uglifyJS: true, base64Images: true,
//   crunchHTML=true, gzip: true
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
  _opts.crunchifyCSS = isBool(opts.crunchifyCSS) ? opts.crunchifyCSS : true
  _opts.merge = isBool(opts.mergeCSS) ? opts.mergeCSS : true
  _opts.crunchHTML = isBool(opts.crunchHTML) ? opts.crunchHTML : true

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

    var all = (txt.match(SCRIPTRGX) || [])
      .concat(txt.match(LINKRGX) || [])
      .concat(txt.match(IMGRGX) || [])
    var pending = all.length

    if (!pending) return callback(null, txt)

    all.forEach(function (el) {
      var url = maybeAbs(xurl(el), root)
      read(url, function (err, buf) {
        if (err) return callback(err)
        if (isLink(el) || isScript(el)) {
          imgSrc2Base64ThenPac(buf, el, url, _opts, done.bind(null, el))
        } else if (isImg(el)) {
          done(el, null, _opts.base64Images ? buf2Base64Img(buf, url) : buf)
        }
      })
    })

  })

}

module.exports = { ballify: ballify, buf2Base64Img: buf2Base64Img }
