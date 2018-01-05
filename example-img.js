var fs = require('fs')
var buf2Base64Img = require('.').buf2Base64Img

function pac2HTML (img) {
  return '<!doctype html><html><body>' + img + '</body></html>'
}

fs.readFile('testfiles/minime.jpg', function (err, buf) {
  if (err) return console.error(err)
  var html = pac2HTML(buf2Base64Img(buf))
  fs.writeFile('example-base64.html', html,  function (err) {
    if (err) return console.error(err)
    console.log('just wrote example-base64.html, open it in a browser...')
  })
})
