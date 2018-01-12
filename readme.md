# ballify

[![build status](http://img.shields.io/travis/chiefbiiko/ballify.svg?style=flat)](http://travis-ci.org/chiefbiiko/ballify) [![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/github/chiefbiiko/ballify?branch=master&svg=true)](https://ci.appveyor.com/project/chiefbiiko/ballify)

***

Pack all frontend assets of a single page app into a single **_ball_**.

`ballify` bundles all assets that are linked into a `HTML` file and concatenates them into one big *ball*, yet another `HTML` file (`brotli`-compressed by default). It packs scripts (empty ones with no innerText/code), stylesheets, images (`jpg`, `gif`, `png`, `svg`), and Google Fonts (loaded via a `link` element). Assets can be read from local or remote sources.

`ballify` is designed to be used with single page apps that are built with ordinary web technologies and do not require toooo many frontend assets.

***

## Get it!

For programmatic usage do:

```
npm install --save-dev ballify
```

Install it globally if you are gonna use the command line interface:

```
npm install --global ballify
```

***

## Usage

### CLI

Simply bundle up all assets that are linked into `index.html` and write that to `ball.html.br`:

```
ballify index.html -o ball.html.br
```

Ballify your single page app and spin up a local devserver @ `localhost:419`:

```
ballify index.html --live
```

You can set all options from the command line. Make sure 2 check out `ballify --help`.

### `node`

``` js
var ballify = require('ballify')

ballify('index.html', function (err, ball) {
  if (err) return console.error(err)
  console.log(ball) // ball is a buffer
})
```

The *ball* is `brotli`-compressed by default. Set `opts.brotli` to `false` to prevent compression, see below.

***

## API

### `ballify(file[, opts], callback)`

Ballify a `HTML` file. The callback has the signature `callback(err, ball)`, with the *ball* being a buffer. Options default to:

``` js
{
  brotli: true // compress the ball with brotli?
  gzip: false, // gzip the ball?
  base64Images: true, // convert image references to base64 data uris?
  base64GoogleFonts: true, // convert Google Font links to base64 inline fonts?
  minifyCSS: true, // remove unnecessary whitespace from CSS?
  mergeCSS: true, // merge recurring selectors within CSS?
  crunchHTML: true // remove unnecessary whitespace from HTML?
}
```

Note that `ballify` treats `opts.brotli` and `opts.gzip` as mutually exclusive, meaning you can either use one or the other but not both.

If `opts.base64Images` is `true` image urls are converted to base64 data uris within `HTML`, `CSS`, and `JS` files. Google Fonts are only converted to inline fonts if they are loaded via an ordinary `link` element.

***

## Why

To keep things simple. To serve all frontend assets in one response.

Go ahead and use `ballify` if you are into single page apps and ready to **_ball_** up!.

***

## License

[MIT](./license.md)
