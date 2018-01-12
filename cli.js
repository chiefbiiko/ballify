#!/usr/bin/env node

// TODO:
//   + add a local dev server with watchify

var fs = require('fs')
var minimist = require('minimist')
var ballify = require('./index')

var HELP =
  '\nUsage: ballify [file] [output] [options]' +
  '\n\nArguments:' +
  '\n  file:\t\t\tinput HTML file, defaults to "index.html"' +
  '\n  output:\t\toutput file, default: "ball.html.br"' +
  '\n\nOptions:' +
  '\n  --brotli\t\tcompress the ball with brotli? default: true' +
  '\n  --gzip\t\tgzip the ball? default: false' +
  '\n  --base64Images\tconvert images to base64?' +
  '\n  --base64GoogleFonts\tconvert GFonts links to inline base64 fonts?' +
  '\n  --uglifyJS\t\tminify JS?' +
  '\n  --crunchifyCSS\tminify CSS?' +
  '\n  --mergeCSS\t\tmerge recurring CSS selectors when minifying CSS?' +
  '\n  --crunchHTML\t\tremove unnecessary whitespace from HTML?' +
  '\n  -o, --output\t\toutput filename, defaults to "ball.html.br"' +
  '\n\n  All options but "--output" and "gzip" default to true.' +
  '\n  To set any of them do "--<option>=false|true" or ' +
       '"--<option> false|true"' +
  '\n  Note that options brotli and gzip are mutually exclusive.' +
  '\n\nMisc & Help:' +
  '\n  -h, --help\t\tprint this usqage guide' +
  '\n  -v, --version\t\tprint the ballify version' +
  '\n\nHave fun using ballify! Get involved @ github.com/chiefbiiko/ballify :)'

var argv = minimist(process.argv.slice(2), { string: [ 'o', 'output' ] })
if (argv.help || argv.h) return console.log(HELP)
if (argv.v || argv.version) return console.log(require('./package').version)

var opts = {
  brotli: argv.brotli !== 'false',
  gzip: argv.gzip !== 'false',
  base64Images: argv.base64Images !== 'false',
  base64GoogleFonts: argv.base64GoogleFonts !== 'false',
  uglifyJS: argv.uglifyJS !== 'false',
  crunchifyCSS: argv.crunchifyCSS !== 'false',
  mergeCSS: argv.mergeCSS !== 'false',
  crunchHTML: argv.crunchHTML !== 'false'
}

var input = argv._[0]
var output
var outopt = argv._[1] || argv.o || argv.output || argv.out
if (!outopt && opts.brotli) output = 'ball.html.br'
else if (!outopt && opts.gzip) output = 'ball.html.gz'
else if (!outopt) output = 'ball.html'
else output = outopt

ballify(input, opts, function (err, ball) {
  if (err) return console.error(err)
  fs.writeFile(output, ball, function (err) {
    if (err) return console.error(err)
    console.log('just got done ballifying ' + output + '...')
  })
})
