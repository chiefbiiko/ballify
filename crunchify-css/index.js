function crunchify (css) {
  var chars = css.split(/\n/).map(function (line) {
    return line.trim()
  }).join('').split('')
  var b = 0
  return chars.reduce(function (acc, char, i, arr) {
    if (char === '{') b++
    else if (char === '}') b--
    if (b === 0 && !/[\s\r\t\f]/.test(char)) acc += char
    else if (b !== 0 && !/[\r\t\f]/.test(char)) acc += char
    return acc
  }, '')
}

module.exports = crunchify
