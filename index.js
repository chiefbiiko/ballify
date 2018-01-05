// TODO:
//   + whatabout gif tiff bmp?!
//   + implement opts - minification!!!
//   + separate api and cli
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
var http = require('follow-redirects').http
var https = require('follow-redirects').https
var valid = require('valid-url')

var XRGX = RegExp('^.*(?:"|\')(.+\\.(?:jpg|jpeg|png|svg))(?:"|\').*$', 'i')
var CSSRGX = RegExp(
  'url\\(\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG)(?:"|\')\\s*\\)', 'g'
)
var SCRIPTRGX = RegExp(
  '<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>', 'g'
)
var IMGRGX = RegExp(
  '<img[^>]+src=(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG)(?:"|\')[^>]*>', 'g'
)
var LINKRGX = RegExp(
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)', 'g'
)
var IDLRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\\.src\\s*=\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG)(?:"|\')', 'g'
)
var SETRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\.setAttribute\\(\\s*(?:"|\')src(?:"|\'),\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG|svg|SVG)(?:"|\')\\s*\\)', 'g'
)

function noop () {}

function pacCSS (css) {
  return '<style>' + css + '</style>'
}

function pacJS (js) {
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

function imgSrc2base64 (buf, el, origin, cb) {
  var txt = buf.toString()
  var all = isLink(el)
    ? (txt.match(CSSRGX) || [])
    : (txt.match(IDLRGX) || []).concat(txt.match(SETRGX) || [])
  var pending = all.length

  if (!pending) return cb(null, pacJS(txt))

  all.forEach(function (stmt) {
    var src = xurl(stmt)
    var url = maybeAbs(src, path.dirname(origin))
    read(url, function (err, imgbuf) {
      if (err) return cb(err)
      txt = txt.replace(src, buf2Base64ImgDataUri(imgbuf, url))
      if (!--pending) cb(null, isLink(el) ? pacCSS(txt) : pacJS(txt))
    })
  })

}

// opts: crunch-css=true, merge-css=true, uglify-js=true, img-base64=false,
//   crunch-html=true, gzip-ball=true
function ballify (index, opts, callback) {
  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  if (!opts) opts = {}
  if (!callback) callback = noop

  index = path.join(index || 'index.html')
  var root = path.dirname(path.join(__dirname, index))

  fs.readFile(index, 'utf8', function (err, txt) {
    if (err) return callback(err)

    function done (el, err, pac) {
      if (err) return callback(err)
      txt = txt.replace(el, pac)
      if (!--pending) callback(null, txt)
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
        if (isLink(el) || isScript(el))
          imgSrc2base64(buf, el, url, done.bind(null, el))
        else if (isImg(el))
          done(el, null, buf2Base64Img(buf, url))
      })
    })

  })

}

module.exports = { ballify: ballify, buf2Base64Img: buf2Base64Img }
