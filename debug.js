var s1 = "vahalla vahala\nimg.src = 'testfiles/minime.jpg'\njujujuju"
var s2 = "dolololo\nimg.setAttribute('src', 'testfiles/minime.png')\nxyz"
var s3 = s1 + s2

var IDLRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\\.src\\s*=\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG)(?:"|\')'
)

var SETRGX = RegExp(
  '[^\\d\\s][^\\s]{1,}\.setAttribute\\(\\s*(?:"|\')src(?:"|\'),\\s*(?:"|\').+' +
  '\\.(?:jpg|jpeg|JPG|JPEG|png|PNG)(?:"|\')\\s*\\)'
)

console.log(IDLRGX)
console.log(IDLRGX.test(s2))
console.log(IDLRGX.test(s1))

console.log(SETRGX)
console.log(SETRGX.test(s1))
console.log(SETRGX.test(s2))

console.log(IDLRGX.test(s3))
console.log(SETRGX.test(s3))

var js = require('fs').readFileSync('testfiles/app2.js', 'utf8')

console.log('ALL', (js.match(IDLRGX) || []).concat(js.match(SETRGX) || []))
