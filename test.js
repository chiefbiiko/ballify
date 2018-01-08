var tape = require('tape')
var fs = require('fs')
var path = require('path')
var child = require('child_process')

var ballify = require('./index').ballify

tape('ball should not contain any more external references', function (t) {
  var testfile = './testfiles/index.html'
  ballify(testfile, function (err, ball) {
    if (err) t.end(err)
    t.notOk(/rel="stylesheet"/i.test(ball), 'no more style links')
    t.notOk(/<script\s+src=".+">/i.test(ball), 'no more external js')
    t.end()
  })
})

tape('getting a url', function (t) {
  var testfile = './testfiles/index2.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.ok(/<script.*><\/script>/.test(buf), 'empty script')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/<script.*>.+<\/script>/.test(ball), 'full script')
      t.ok(ball.length > 1000, 'rily there')
      t.end()
    })
  })
})

tape('only empty scripts are replaced', function (t) {
  var testfile = './testfiles/index3.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.ok(/<script.*>1\+1<\/script>/.test(buf), 'dumb script there')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/<script.*>1\+1<\/script>/.test(ball), 'dumb script there still')
      t.end()
    })
  })
})

tape('non "https?"-prefixed urls', function (t) {
  var testfile = 'testfiles/index4.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.notOk(/<script[^>]*>.+<\/script>/.test(buf), 'no full script')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/<script[^>]*>.+<\/script>/.test(ball), 'full script')/*[^<]*/
      t.end()
    })
  })
})

tape('replacing img src in html', function (t) {
  var testfile = 'testfiles/index5.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.notOk(/<img src="data.+"/.test(buf), 'img data uri not present')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/<img src="data.+"/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('replacing img sources in js', function (t) {
  var testfile = 'testfiles/index6.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.notOk(/data:image\/\*;base64,/.test(buf), 'img data uri not present')
    t.notOk(/data:image\/svg\+xml;base64,/.test(buf), 'no svg data uri')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/data:image\/\*;base64,/.test(ball), 'img data uri present')
      t.ok(/data:image\/svg\+xml;base64,/.test(ball), 'svg data uri present')
      t.end()
    })
  })
})

tape('in-html svg img to base 64 img', function (t) {
  var testfile = 'testfiles/index7.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.notOk(/data:image\/svg\+xml;base64,/.test(buf), 'no img data uri')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/data:image\/svg\+xml;base64,/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('replacing img urls in css', function (t) {
  var testfile = 'testfiles/index8.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.notOk(/data:image\/\*;base64,/.test(buf), 'img data uri not present')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/data:image\/\*;base64,/.test(ball), 'img data uri present')
      t.end()
    })
  })
})

tape('converting a gif to a base64 representation', function (t) {
  var testfile = 'testfiles/index9.html'
  fs.readFile(testfile, function (err, buf) {
    if (err) t.end(err)
    t.notOk(/data:image\/\*;base64,/.test(buf), 'gif data uri not present')
    ballify(testfile, function (err, ball) {
      if (err) t.end(err)
      t.ok(/data:image\/\*;base64,/.test(ball), 'gif data uri present')
      t.end()
    })
  })
})

tape('ball name can be set from cli', function (t) {
  var testfile = './testfiles/index.html'
  var outfile = './testfiles/bundle.html'
  var cmd = 'node old_cli.js ' + testfile + ' ' + outfile
  child.exec(cmd, function (err, stdout, stderr) {
   if (err || stderr) t.end(err || stderr)
   t.ok(fs.existsSync(outfile), 'file should exist')
   fs.unlink(outfile, function (err) {
     if (err) t.end('could not delete ' + outfile)
     t.end()
   })
  })
})
