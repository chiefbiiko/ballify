// TODO:
//   + consider svgs when looking for images
//   + ballify images inclluded in css! to base64
//   + ~check whether links without rel="stylesheet" are actually css~
//   + ~print help on demand~
//   + ~test GET~
//   + separate api and cli
//   + ~implement GET against non-"https?" prefixed urls + test!~
//   + ~ballify images: to base64? - ALSO WITHIN js !!!~
//   + implement opts!!!
//   + ~write a test that shows that only empty scripts are considered~
//   + ~if input is not supplied look for index.html in cwd~

var fs = require('fs')
var path = require('path')
var http = require('follow-redirects').http
var https = require('follow-redirects').https
var valid = require('valid-url')

var XRGX = RegExp('^.*(?:"|\')(.+\\.(?:jpg|jpeg|png))(?:"|\').*$', 'i')
var SCRIPTRGX = RegExp('<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>')
var IMGRGX = RegExp('<img[^>]+src=(?:"|\').+(?:"|\')[^>]*>')
var LINKRGX = RegExp(
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)'
)
var IDLRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\\.src\\s*=\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG)(?:"|\')'
)
var SETRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\.setAttribute\\(\\s*(?:"|\')src(?:"|\'),\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG)(?:"|\')\\s*\\)'
)

function noop () {}

function pacCSS (css) {
  return '<style>' + css + '</style>'
}

function pacJS (js) {
  return '<script>' + js + '</script>'
}

function buf2Base64ImgDataUri (buf) {
  return 'data:image/*;base64,' + buf.toString('base64')
}

function buf2Base64Img (buf) {
  return '<img src="' + buf2Base64ImgDataUri(buf) + '" alt="base64-image">'
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

function xurl (ele) {
  if (isLink(ele)) return xhref(ele)
  else if (isImg(ele) || isScript(ele)) return xsrc(ele)
  else return xyzsrc(ele)
}

function isImg (ele) {
  return ele.startsWith('<img')
}

function isScript (ele) {
  return ele.startsWith('<script')
}

function isLink (ele) {
  return ele.startsWith('<link')
}

function maybeAbs (url, root) { // magic 36 to make sure its not a url
  if (url.startsWith('http') || path.isAbsolute(url)) return url
  else if (!valid.isUri(url) && url.length < 36) return path.join(root, url)
  else return url
}

function JSimgSrc2base64 (buf, origin, cb) {
  var js = buf.toString()
  var all = (js.match(IDLRGX) || []).concat(js.match(SETRGX) || [])
  var pending = all.length

  if (!pending) return cb(null, pacJS(js))

  all.forEach(function (stmt) {
    var src = xurl(stmt)
    var url = maybeAbs(src, path.dirname(origin))
    read(url, function (err, buf) {
      if (err) return cb(err)
      js = js.replace(src, buf2Base64ImgDataUri(buf))
      if (!--pending) cb(null, pacJS(js))
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

    var all = (txt.match(SCRIPTRGX) || [])
      .concat(txt.match(LINKRGX) || [])
      .concat(txt.match(IMGRGX) || [])

    var pending = all.length

    if (!pending) return callback(null, txt)

    function done (ele, err, pac) {
      if (err) return callback(err)
      txt = txt.replace(ele, pac)
      if (!--pending) callback(null, txt)
    }

    all.forEach(function (ele) {
      var url = maybeAbs(xurl(ele), root)
      read(url, function (err, buf) {
        if (err) return callback(err)
        if (isLink(ele)) done(ele, null, pacCSS(buf))
        else if (isScript(ele)) JSimgSrc2base64(buf, url, done.bind(null, ele))
        else if (isImg(ele)) done(ele, null, buf2Base64Img(buf))
      })
    })

  })

}

module.exports = { ballify: ballify, buf2Base64Img: buf2Base64Img }
