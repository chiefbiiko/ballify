var child = require('child_process')
var fs = require('fs')
var ballify = require('./index').ballify

ballify('testfiles/index99.html', function (err, ball) {
  if (err) return console.error(err)
  fs.writeFile('example.html', ball, function (err) {
    if (err) return console.error(err)
    console.log('just wrote example.html, opening chrome...')
    child.exec('open chrome example.html', function (err, stdout, stderr) {
      if (err || stderr) return console.error(err || stderr)
      console.log('verify that the generated ball still is a working webpage')
    })
  })
})
