var tape = require('tape')
var fs = require('fs')
var path = require('path')
var child = require('child_process')

var ballify = require('./index').ballify

tape('ball should not contain any more external references', function (t) {

  ballify('./testfiles/index.html', function (err, ball) {
    if (err) t.end(err)

    t.notOk(/rel="stylesheet"/i.test(ball), 'no more style links')
    t.notOk(/<script\s+src=".+">/i.test(ball), 'no more external js')

    t.end()
  })

})

tape('ball name can be set from cli', function (t) {

  var cmd = 'node cli ./testfiles/index.html ./testfiles/bundle.html'

  child.exec(cmd, function (err, stdout, stderr) {
   if (err || stderr) t.end(err || stderr)

   t.ok(fs.existsSync('./testfiles/bundle.html'), 'file should exist')

   fs.unlink('./testfiles/bundle.html', function (err) {
     if (err) t.end('could not delete ./testfiles/bundle.html')
     t.end()
   })

  })

})

tape('getting a url', function (t) {

  fs.readFile('./testfiles/index2.html', function (err, buf) {
    if (err) t.end(err)

    t.ok(/<script.*><\/script>/.test(buf), 'empty script')

    ballify('./testfiles/index2.html', function (err, ball) {
      if (err) t.end(err)

      t.ok(/<script.*>[^<]+<\/script>/.test(ball), 'full script')
      t.ok(ball.length > 1000, 'rily there')

      t.end()
    })

  })

})

tape('only empty scripts are replaced', function (t) {

  fs.readFile('./testfiles/index3.html', function (err, buf) {
    if (err) t.end(err)

    t.ok(/<script.*>1\+1<\/script>/.test(buf), 'dumb script there')

    ballify('./testfiles/index3.html', function (err, ball) {
      if (err) t.end(err)

      t.ok(/<script.*>1\+1<\/script>/.test(ball), 'dumb script there still')

      t.end()
    })

  })

})

tape('non "https?"-prefixed urls', function (t) {

  ballify('testfiles/index4.html', function (err, ball) {
    if (err) t.end(err)

    t.ok(/<script[^>]*>.+<\/script>/.test(ball), 'full script')

    t.end()
  })

})

tape('replacing img src in html', function (t) {

  fs.readFile('testfiles/index5.html', function (err, buf) {
    if (err) t.end(err)

    t.notOk(/<img src="data.+"/.test(buf), 'img data uri not present')

    ballify('testfiles/index5.html', function (err, ball) {
      if (err) t.end(err)

      t.ok(/<img src="data.+"/.test(ball), 'img data uri present')

      t.end()
    })

  })

})

tape('replacing img sources in js', function (t) {

  fs.readFile('testfiles/index6.html', function (err, buf) {
    if (err) t.end(err)

    t.notOk(/data:image\/\*;base64,/.test(buf), 'img data uri not present')
    t.notOk(/data:image\/svg\+xml;base64,/.test(buf), 'no svg data uri')

    ballify('testfiles/index6.html', function (err, ball) {
      if (err) t.end(err)

      t.ok(/data:image\/\*;base64,/.test(ball), 'img data uri present')
      t.ok(/data:image\/svg\+xml;base64,/.test(ball), 'svg data uri present')

      t.end()
    })

  })

})

tape('in-html svg img to base 64 img', function (t) {

  fs.readFile('testfiles/index7.html', function (err, buf) {
    if (err) t.end(err)

    t.notOk(/data:image\/svg\+xml;base64,/.test(buf), 'img data uri not present')

    ballify('testfiles/index7.html', function (err, ball) {
      if (err) t.end(err)

      t.ok(/data:image\/svg\+xml;base64,/.test(ball), 'img data uri present')

      t.end()
    })

  })

})

tape('replacing img urls in css', function (t) {



})
