# ballify

[![build status](http://img.shields.io/travis/chiefbiiko/ballify.svg?style=flat)](http://travis-ci.org/chiefbiiko/ballify) [![AppVeyor Build Status](https://ci.appveyor.com/api/projects/status/github/chiefbiiko/ballify?branch=master&svg=true)](https://ci.appveyor.com/project/chiefbiiko/ballify)

***

Pack all frontend assets of a single page application into a single *ball*.

`ballify` bundles all resources that are linked into a `HTML` file and concatenates them into one big *ball*, yet another `HTML` file (gzipped by default). It packs scripts (empty ones with no innerText/code), stylesheets, images (`jpg`, `gif`, `png`, `svg`), and Google Fonts (loaded via a `link` element). Assets can be read from local or remote sources.

`ballify` is designed to be used with single page aplications that require just a few front-end assets.

***

## Get it!

For programmatic usage do:

```
npm install --save-dev ballify
```

Install it globally if you wish to use the command line interface.

```
npm install --global ballify
```

***

## Usage

### CLI

```
ballify index.html -o ball.html.gz
```

Check out `ballify --help`.

### API

``` js
var ballify = require('ballify')

ballify('index.html', function (err, ball) {
  if (err) return console.error(err)
  console.log(ball) // ball is a buffer
})
```

The *ball* is gzipped by default. Set `opts.gzip` to `false` to prevent compression, see below.

***

## API

### `ballify(file[, opts], callback)`

Ballify a `HTML` file. The callback has the signature `callback(err, ball)`, with the *ball* being a buffer. Options default to:

``` js
{
  gzip: true, // gzip the final ball?
  base64Images: true, // convert image references to base64 data uris?
  base64GoogleFonts: true, // convert Google Font links to base64 inline fonts?
  minifyCSS: true, // remove unnecessary whitespace from CSS?
  mergeCSS: true, // merge recurring selectors within CSS?
  crunchHTML: true // remove unnecessary whitespace from HTML?
}
```

***

### Why

To keep things simple. To serve all front-end assets in one response.

Go ahead and use `ballify` if you are developing a single page application and wish to bundle up all frontend assets into one file.

***

## License

[MIT](./license.md)
