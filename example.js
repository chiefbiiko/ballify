var child = require('child_process')
var fs = require('fs')
var ballify = require('./index')

ballify('testfiles/index99.html', { gzip: false }, function (err, ball) {
  if (err) return console.error(err)
  fs.writeFile('example.html', ball, function (err) {
    if (err) return console.error(err)
    console.log('just wrote example.html, opening chrome...')
    child.exec('start chrome example.html', function (err, stdout, stderr) {
      if (err || stderr) return console.error(err || stderr)
      console.log('verify that the generated ball still is a working webpage')
    })
  })
})
