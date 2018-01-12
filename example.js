var fs = require('fs')
var ballify = require('./index')

var example = 'testfiles/index99.html'

ballify(example, { brotli: false }, function (err, ball, assets) {
  if (err) return console.error(err)
  console.log('just ballified these assets:\n%s\n', assets.join('\n'))
  fs.writeFile('example.html', ball, function (err) {
    if (err) return console.error(err)
    console.log('and wrote example.html, open it in a browser!')
  })
})
