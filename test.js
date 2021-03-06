var tape = require('tape')
var fs = require('fs')
var path = require('path')
var child = require('child_process')
var zlib = require('zlib')
var unbrotli = require('iltorb').decompress

var ballify = require('./index')

function problyMinified (code) {
  return (code.match(/\n/g) || []).length < (code.length / 160)
}

tape('ball should not contain any more external references', function (t) {
  var testfile = './testfiles/index.html'
  ballify(testfile, { brotli: false }, function (err, ball) {
    if (err) t.end(err)
    t.false(/rel="stylesheet"/i.test(ball), 'no more style links')
    t.false(/<script\s+src=".+">/i.test(ball), 'no more external js')
    t.end()
  })
})

tape('getting a url', function (t) {
  var testfile = './testfiles/index2.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.true(/<script.*><\/script>/.test(buf), 'empty script')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/<script.*>.+<\/script>/.test(ball), 'full script')
      t.true(ball.length > 1000, 'rily there')
      t.end()
    })
  })
})

tape('only empty scripts are replaced', function (t) {
  var testfile = './testfiles/index3.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.true(/<script.*>1\+1<\/script>/.test(buf), 'dumb script there')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/<script.*>1\+1<\/script>/.test(ball), 'dumb script there still')
      t.end()
    })
  })
})

tape('non "https?"-prefixed urls', function (t) {
  var testfile = 'testfiles/index4.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/<script[^>]*>.+<\/script>/.test(buf), 'no full script')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/<script[^>]*>.+<\/script>/.test(ball), 'full script')
      t.end()
    })
  })
})

tape('replacing img src in html', function (t) {
  var testfile = 'testfiles/index5.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/<img src="data.+"/.test(buf), 'img data uri not present')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/<img src="data.+"/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('replacing img sources in js', function (t) {
  var testfile = 'testfiles/index6.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:image\/\*;base64,/.test(buf), 'img data uri not present')
    t.false(/data:image\/svg\+xml;base64,/.test(buf), 'no svg data uri')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:image\/\*;base64,/.test(ball), 'img data uri present')
      t.true(/data:image\/svg\+xml;base64,/.test(ball), 'svg data uri present')
      t.end()
    })
  })
})

tape('in-html svg img to base 64 img', function (t) {
  var testfile = 'testfiles/index7.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:image\/svg\+xml;base64,/.test(buf), 'no img data uri')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:image\/svg\+xml;base64,/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('replacing img urls in css', function (t) {
  var testfile = 'testfiles/index8.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:image\/\*;base64,/.test(buf), 'img data uri not present')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:image\/\*;base64,/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('converting a gif to a base64 representation', function (t) {
  var testfile = 'testfiles/index9.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:image\/\*;base64,/.test(buf), 'gif data uri not present')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:image\/\*;base64,/.test(ball), 'gif data uri present')
      t.end()
    })
  })
})

tape('ball name can be set from cli', function (t) {
  var testfile = './testfiles/index.html'
  var outfile = './testfiles/bundle.html'
  var cmd = 'node cli.js ' + testfile + ' -o ' + outfile +
    ' --brotli=false --gzip=false'
  child.exec(cmd, function (err, stdout, stderr) {
   if (err || stderr) t.end(err || stderr)
   t.true(fs.existsSync(outfile), 'file should exist')
   fs.unlink(outfile, function (err) {
     if (err) t.end('could not delete ' + outfile)
     t.end()
   })
  })
})

tape('replacing img urls in css that do not have quotes', function (t) {
  var testfile = 'testfiles/index11.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:image\/\*;base64,/.test(buf), 'img data uri not present')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:image\/\*;base64,/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('getting fonts from Google', function (t) {
  var testfile = 'testfiles/index12.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:font\/.+;base64,/.test(buf), 'no font data uri')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:font\/.+;base64,/.test(ball), 'font data uri there')
      t.end()
    })
  })
})

tape('disabling css minification', function (t) {
  var testfile = 'testfiles/index.html'
  var opts = { brotli: false, minifyCSS: false }
  fs.readFile(testfile, 'utf8', function (err, txt) {
    if (err) t.end(err)
    var cssA = txt.replace(/^.+<style>(.+)<\/style>.+$/, '$1')
    t.false(problyMinified(cssA), 'css is not minified before balling')
    ballify(testfile, opts, function (err, ball) {
      if (err) t.end(err)
      var cssB = ball.toString().replace(/^.+<style>(.+)<\/style>.+$/, '$1')
      t.false(problyMinified(cssB), 'css is not minified after balling')
      t.end()
    })
  })
})

tape('disabling js minification from cli', function (t) {
  var testfile = 'testfiles/index.html'
  var outfile = 'testfiles/bundle.html'
  var cmd = 'node cli ' + testfile + ' --output ' + outfile +
            ' --brotli=false --gzip=false --uglifyJS=false'
  child.exec(cmd, function (err, stdout, stderr) {
    if (err || stderr) t.end(err || stderr)
    fs.readFile(outfile, 'utf8', function (err, txt) {
      if (err) t.end(err)
      var js = txt.replace(/^.+<script>(.+)<\/script>.+$/, '$1')
      t.false(problyMinified(js), 'js should not be minified')
      fs.unlink(outfile, function (err) {
        if (err) t.end(err)
        t.end()
      })
    })
  })
})

tape('disabling ballifying Google Fonts', function (t) {
  var testfile = 'testfiles/index12.html'
  var opts = { brotli: false, base64GoogleFonts: false }
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.false(/data:font\/.+;base64,/.test(buf), 'no font data uri')
    ballify(testfile, opts, function (err, ball) {
      if (err) t.end(err)
      t.false(/data:font\/.+;base64,/.test(ball), 'still no font data uri')
      t.end()
    })
  })
})

tape('preserving inline img attributes', function (t) {
  var testfile = 'testfiles/index13.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.true(/<img\sid="pic"/.test(buf), 'img id there')
    ballify(testfile, { brotli: false }, function (err, ball) {
      if (err) t.end(err)
      t.true(/data:image\/.+;base64,/.test(ball), 'img data uri there')
      t.true(/<img\sid="pic"/.test(ball), 'img id there')
      t.end()
    })
  })
})

tape('lossless gzip compression', function (t) {
  var testfile = 'testfiles/index99.html'
  ballify(testfile, { gzip: true, brotli: false }, function (err, gzip) {
    if (err) t.end(err)
    ballify(testfile, { brotli: false }, function (err, nogzip) {
      if (err) t.end(err)
      zlib.gunzip(gzip, function (err, gunzip) {
        if (err) t.end(err)
        t.true(gunzip.equals(nogzip), 'lossless gzip')
        t.end()
      })
    })
  })
})

tape('lossless brotli compression', function (t) {
  var testfile = 'testfiles/index99.html'
  ballify(testfile, { brotli: true }, function (err, brot) {
    if (err) t.end(err)
    ballify(testfile, { brotli: false }, function (err, nobrot) {
      if (err) t.end(err)
      unbrotli(brot, function (err, unbrot) {
        if (err) t.end(err)
        t.true(unbrot.equals(nobrot), 'lossless brotli')
        t.end()
      })
    })
  })
})

tape('passing assets', function (t) {
  var testfile = 'testfiles/index99.html'
  ballify(testfile, function (err, ball, assets) {
    if (err) t.end(err)
    t.true(Array.isArray(assets), 'assets is an array')
    t.true(assets.length > 0, 'non-empty array')
    t.end()
  })
})
