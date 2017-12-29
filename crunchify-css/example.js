var fs = require('fs')
var crunchify = require('.')

fs.readFile('./test.css', 'utf8', function (err, css) {
  if (err) return console.error(err)
  console.log('original:\n' + css)
  console.log('crunchy:\n' + crunchify(css))
})
