var fs = require('fs')
var tape = require('tape')
var crunchify = require('.')

var CSS = fs.readFileSync('./test.css', 'utf8')

tape('strips whitespace', function (t) {

  var crunch = crunchify(CSS)

  t.notOk(/[\r\n\t\f]/g.test(crunch))

  t.end()
})

tape('collapses where posssible', function (t) {

  var crunch = crunchify(CSS)

  t.is(crunch.match(/body/g).length, 1, 'only one "body" should be left')

  t.end()
})
