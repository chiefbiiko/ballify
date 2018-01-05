var fs = require('fs')
var buf2Base64Img = require('.').buf2Base64Img

function pac2HTML (img) {
  return '<!doctype html><html><body>' + img + '</body></html>'
}

var url = 'testfiles/minime.jpg'

fs.readFile(url, function (err, buf) {
  if (err) return console.error(err)
  var html = pac2HTML(buf2Base64Img(buf, url)) // passing url to peep type
  fs.writeFile('example-img.html', html,  function (err) {
    if (err) return console.error(err)
    console.log('just wrote example-img.html, opening chrome...')
    child.exec('open chrome example-img.html', function (err, stdout, stderr) {
      if (err || stderr) return console.error(err || stderr)
      console.log('verify that the generated ball still is a working webpage')
    })
  })
})
