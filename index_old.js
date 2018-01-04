// TODO:
//   + ~check whether links without rel="stylesheet" are actually css~
//   + ~print help on demand~
//   + ~test GET~
//   + separate api and cli
//   + ~implement GET against non-"https?" prefixed urls + test!~
//   + ballify images: to base64? - ALSO WITHIN js !!!
//   + implement minifying scripts and styles and gzippin (add as cli args)
//   + ~write a test that shows that only empty scripts are considered~
//   + ~if input is not supplied look for index.html in cwd~

var fs = require('fs')
var path = require('path')
var http = require('follow-redirects').http
var https = require('follow-redirects').https
var valid = require('valid-url')

var SCRIPTRGX = RegExp('<script[^>]+src=(?:"|\').+(?:"|\')[^>]*>\s*<\/script>')

var IMGRGX = RegExp('<img[^>]+src=(?:"|\').+(?:"|\')[^>]*>')

var LINKRGX = RegExp(
  '(?:<link[^>]+rel=(?:"|\')stylesheet(?:"|\')[^>]+' +
  'href=(?:"|\').+(?:"|\')[^>]*>)|' +
  '(?:<link[^>]+href=(?:"|\').+(?:"|\')[^>]+' +
  'rel=(?:"|\')stylesheet(?:"|\')[^>]*>)'
)

var IDLRGX = RegExp(
  '[^\\d][^\\s]{1,}\\.src\\s*=\\s*("|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG)("|\')'
)

var SETRGX = RegExp(
  '[^\\d][^\\s]{1,}\.setAttribute\\(\\s*("|\')src("|\'),\\s*("|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG)("|\')\\s*\\)'
)

function noop () {}

function pacCSS (css, cb) {
  cb(null, '<style>' + css + '</style>')
}

function pacJS (js, cb) {
  cb(null, '<script>' + js + '</script>')
}

function buf2Base64ImgDataUri (buf, cb) {
  cb(null, 'data:image/*;base64,' + buf.toString('base64'))
}

function buf2Base64Img (buf, cb) {
  buf2Base64ImgDataUri(buf, function (err, datauri) {
    if (err) return cb(err)
    cb(null, '<img src="' + datauri + '" alt="base64-image">')
  })
  // var src = 'data:image/*;base64,' +  buf.toString('base64')
  // return '<img src="' + buf2Base64ImgDataUri(buf) + '" alt="base64-image">'
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

function xurl (element) {
  if (isLink(element)) return xhref(element)
  else if (isImg(element) || isScript(element)) return xsrc(element)
}

function isImg (element) {
  return element.startsWith('<img')
}

function isScript (element) {
  return element.startsWith('<script')
}

function isLink (element) {
  return element.startsWith('<link')
}

function maybeAbs (url, root) { // magic 36 to make sure its not a url
  if (url.startsWith('http') || path.isAbsolute(url)) return url
  else if (!valid.isUri(url) && url.length < 36) return path.join(root, url)
  else return url
}

function JSimgSrc2base64 (buf, root, cb) {
  // find all img.src = img.setAttibute('src', '')
  var js = buf.toString()
  var all = (js.match(IDLRGX) || []).concat(js.match(SETRGX) || [])
  // take into account location shifts: use path.join(url, imgurl)
  var pending = all.length
//var out = js
  if (!pending) return pacJS(js, cb)//cb(null, pacJS(js))
  // function done (url, err, datauri) {
  //   if (err) return callback(err)
  //   js = js.replace(url, datauri)
  //   if (!--pending) cb(null, js)
  // }

  all.forEach(function (element) {
    var url = maybeAbs(xsrc(element), root)
    read(url, function (err, buf) {
      if (err) return cb(err)
      buf2Base64ImgDataUri(buf, function (err, datauri) {
        if (err) return cb(err)
        js = js.replace(url, datauri)
        if (!--pending) pacJS(js, cb)//cb(null, pacJS(js))
      })
      // js = js.replace(url, buf2Base64ImgDataUri(buf))
      // if (!--pending) cb(null, pacJS(js))
      // done(url, null, )
      // buf2base64(buf, done.bind(null, url))
    })
  })
  // read the img
  // convert it base64 and replace in og
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
    if (err) return callback(err)

    var all = (txt.match(SCRIPTRGX) || [])
      .concat(txt.match(LINKRGX) || [])
      .concat(txt.match(IMGRGX) || [])

    var pending = all.length
    var out = txt
    function done (element, err, pac) {
      if (err) return callback(err)
      out = out.replace(element, pac)
      if (!--pending) callback(null, out)
    }

    all.forEach(function (element) {
      var url = maybeAbs(xurl(element), root)
      read(url, function (err, buf) {
        if (err) return callback(err)
        if (isLink(element)) {
          // pacCSS(buf, done.bind(null, element))
          pacCSS(buf, done.bind(null, element))
          // done(element, null, pacCSS(buf))
        } else if (isScript(element)) {
          // replacing img urls in js ..!!!
          JSimgSrc2base64(buf, url, done.bind(null, element))
          // pacJS(buf, done.bind(null, element))
        } else if (isImg(element)) {
          buf2Base64Img(buf, done.bind(null, element))
          // done(element, null, buf2Base64Img(buf))
        }
      })
    })

  })

}

module.exports = { ballify: ballify, buf2Base64Img: buf2Base64Img }
