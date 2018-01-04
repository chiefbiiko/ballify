var ballify = require('./index').ballify

ballify('testfiles/index6.html', function (err, ball) {
  if (err) return console.error(err)
  console.log(ball)
})
