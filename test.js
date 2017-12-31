var tape = require('tape')
var fs = require('fs')
var path = require('path')
var child = require('child_process')

var ballify = require('.')

tape('ball should not contain any more external references', function (t) {

  ballify('./testfiles/index.html', {}, function (err, ball) {
    if (err) t.end(err)

    t.notOk(/rel="stylesheet"/i.test(ball), 'no more style links')
    t.notOk(/<script\s+src=".+">/i.test(ball), 'no more external js')

    t.end()
  })

})

tape('ball name can be set from cli', function (t) {

  child.execSync('node cli ./testfiles/index.html ./testfiles/bundle.html')

  t.ok(fs.existsSync('./testfiles/bundle.html'), 'file should exist')

  fs.unlinkSync('./testfiles/bundle.html')
  t.end()
})

tape('getting a url', function (t) {

  var og = fs.readFileSync('./testfiles/index2.html', 'utf8')

  t.ok(/<script.*><\/script>/.test(og), 'empty script')

  ballify('./testfiles/index2.html', {}, function (err, ball) {
    if (err) t.end(err)

    t.ok(/<script.*>[^<]+<\/script>/.test(ball), 'full script')
    t.ok(ball.length > 1000, 'rily there')

    t.end()
  })

})

tape('only empty scripts are replaced', function (t) {

  var og = fs.readFileSync('./testfiles/index3.html', 'utf8')

  t.ok(/<script.*>1\+1<\/script>/.test(og), 'dumb script there')

  ballify('./testfiles/index3.html', {}, function (err, ball) {
    if (err) t.end(err)

    t.ok(/<script.*>1\+1<\/script>/.test(ball), 'dumb script there still')

    t.end()
  })

})

tape('non "https?"-prefixed urls', function (t) {

  ballify('testfiles/index4.html', function (err, ball) {
    if (err) t.end(err)

    t.ok(/<script[^>]*>.+<\/script>/.test(ball), 'full script')

    t.end()
  })

})
