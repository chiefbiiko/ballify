#!/usr/bin/env node

var fs = require('fs')
var minimist = require('minimist')
var ballify = require('./index')

var HELP =
  '\nUsage: ballify [file] [output] [options]' +
  '\n\nArguments:' +
  '\n  file:\t\t\tinput HTML file' +
  '\n  output:\t\tfilename for the output, the ball' +
  '\n\nOptions:' +
  '\n  --gzip\t\tgzip the ball?' +
  '\n  --base64Images\tconvert images to base64?' +
  '\n  --uglifyJS\t\tminify JS?' +
  '\n  --crunchifyCSS\tminify CSS?' +
  '\n  --mergeCSS\t\tmerge recurring CSS selectors when minifying CSS?' +
  '\n  --crunchHTML\t\tremove unnecessary whitespace from HTML?' +
  '\n  -o, --output\t\toutput filename, defaults to "ball.html.gz"' +
  '\n\n  All options but "--output" are boolean flags that default to true.' +
  '\n  To disable any of them do "--<option>=false" or "--<option> false"'

var argv = minimist(process.argv.slice(2), { string: [ 'o', 'output' ] })
var opts = {
  gzip: argv.gzip !== 'false',
  base64Images: argv.base64Images !== 'false',
  uglifyJS: argv.uglifyJS !== 'false',
  crunchifyCSS: argv.crunchifyCSS !== 'false',
  mergeCSS: argv.mergeCSS !== 'false',
  crunchHTML: argv.crunchHTML !== 'false'
}
var input = argv._[0]
var output = argv._[1] || argv.o || argv.out || argv.output || 'ball.html'
if (opts.gzip) output += '.gz'
if (argv.help || argv.h) return console.log(HELP)

ballify(input, opts, function (err, ball) {
  if (err) return console.error(err)
  fs.writeFile(output, ball, function (err) {
    if (err) return console.error(err)
    console.log('just finished balling ' + output + '...')
  })
})
