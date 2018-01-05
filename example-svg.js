var ballify = require('./index').ballify
var fs = require('fs')
var child = require('child_process')

ballify('testfiles/index7.html', function (err, ball) {
  if (err) return console.error(err)
  fs.writeFile('example-svg.html', ball, function (err) {
    if (err) return console.error(err)
    console.log('opening chrome...')
    child.exec('open chrome example-svg.html', function (err, stdout, stderr) {
      if (err || stderr) return console.error(err || stderr)
      console.log('verify that the generated ball still is a working webpage')
    })
  })
})
