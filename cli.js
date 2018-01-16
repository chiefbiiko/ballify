#!/usr/bin/env node

// TODO:
//   + http2 devserver that pushes onchange of any assets

var fs = require('fs')
var http = require('http')
var minimist = require('minimist')
var watch = require('recursive-watch')
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
  '\n  --base64GoogleFonts\tmake Google Fonts links inline base64 fonts?' +
  '\n  --uglifyJS\t\tminify JS?' +
  '\n  --minifyCSS\t\tminify CSS?' +
  '\n  --mergeCSS\t\tmerge recurring CSS selectors when minifying CSS?' +
  '\n  --crunchHTML\t\tremove unnecessary whitespace from HTML?' +
  '\n  -o, --output\t\toutput filename, default: "ball.html.br"' +
  '\n  --live\t\tspin up a local dev server?' +
  '\n  --port\t\tport for the local dev server, default: 419 ' +
  '\n\n  All options but "output", "port", "gzip", and "live" ' +
       'default to true.' +
  '\n  To set any of them do "--<option>=false|true" or ' +
       '"--<option> false|true"' +
  '\n  Note that options "brotli" and "gzip" are mutually exclusive.' +
  '\n\nMisc & Help:' +
  '\n  -h, --help\t\tprint this usage guide' +
  '\n  -v, --version\t\tprint the ballify version' +
  '\n\nHave fun using ballify! Get involved @ github.com/chiefbiiko/ballify :)'

var miniopts = {
  string: [ 'o', 'output' ],
  boolean: [ 'gzip', 'h', 'help', 'v', 'version', 'live' ],
  number: [ 'port' ]
}

var argv = minimist(process.argv.slice(2), miniopts)

if (argv.h || argv.help) return console.log(HELP)
if (argv.v || argv.version) return console.log(require('./package').version)

var opts = {
  brotli: argv.brotli !== 'false',
  gzip: argv.gzip,
  base64Images: argv.base64Images !== 'false',
  base64GoogleFonts: argv.base64GoogleFonts !== 'false',
  uglifyJS: argv.uglifyJS !== 'false',
  crunchifyCSS: argv.crunchifyCSS !== 'false',
  mergeCSS: argv.mergeCSS !== 'false',
  crunchHTML: argv.crunchHTML !== 'false',
  live: argv.live,
  port: argv.port || 419
}

var input = argv._[0]
var output
var outopt = argv._[1] || argv.o || argv.output || argv.out
if (!outopt && opts.brotli) output = 'ball.html.br'
else if (!outopt && opts.gzip) output = 'ball.html.gz'
else if (!outopt) output = 'ball.html'
else output = outopt

var watching = []
var server
var stash

function watchNewAssets (oldAssets, assets, watchCallback) {
   assets.filter(fs.existsSync).filter(function (localAsset) {
     return !oldAssets.includes(localAsset)
   }).forEach(function (newAsset) {
     watching.push(newAsset)
     watch(newAsset, watchCallback)
   })
}

function onchange (file) {
  console.log(file + ' changed...')
  ballify(input, opts, onball)
}

function onconnection (req, res) {
    res.writeHead(200, {
      'content-type': 'text/html; charset="utf-8"',
      'content-encoding': opts.brotli ? 'br' : opts.gzip ? 'gzip' : 'identity',
      'transfer-encoding': 'chunked'
    })
    res.end(stash)
}

function onlisten () {
  console.log('ballify devserver up  @ localhost:' + opts.port)
}

function onball (err, ball, assets) {
  if (err) return console.error(err)

  if (opts.live) {
    if (!server.listening) server.listen(opts.port, 'localhost', onlisten)
    stash = ball
    watchNewAssets(watching, assets, onchange)
  }

  fs.writeFile(output, ball, function (err) {
    if (err) return console.error(err)
    console.log('DONE ballifying %s!\nassets:\n%s', output, assets.join('\n'))
  })
}

if (opts.live) {
  server = http.createServer(onconnection)
  watching.push(input)
  watch(input, onchange)
}

ballify(input, opts, onball)
