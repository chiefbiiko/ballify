var tape = require('tape')
var fs = require('fs')
var path = require('path')
var child = require('child_process')

tape.onFinish(function () {
  fs.unlinkSync('./ball.html')
  fs.unlinkSync('./testfiles/bundle.html')
})

tape('ball should not contain any more external references', function (t) {

  child.execSync('node index ./testfiles/index.html')

  var ball = fs.readFileSync('./ball.html').toString()

  t.notOk(/rel="stylesheet"/i.test(ball), 'no more style links')
  t.notOk(/<script\s+src=".+">/i.test(ball), 'no more external js')

  t.end()
})

tape('ball name can be set', function (t) {

  child.execSync('node index ./testfiles/index.html ./testfiles/bundle.html')

  t.ok(fs.existsSync('./testfiles/bundle.html'), 'file should exist')

  t.end()
})
