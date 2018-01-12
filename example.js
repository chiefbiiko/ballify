var fs = require('fs')
var ballify = require('./index')

ballify('testfiles/index99.html', { brotli: false }, function (err, ball) {
  if (err) return console.error(err)
  fs.writeFile('example.html', ball, function (err) {
    if (err) return console.error(err)
    console.log('just wrote example.html, open it in a browser!')
  })
})
