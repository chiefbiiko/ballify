function crunchify (css, opts) { // maybe: swap 0px with 0? 6d hex w/ 3d hex?
  if (!opts) opts = { merge: true }

  // strippin
  var stripd = css.split(/\n/).map(function (line) {
    line = line
      .replace(/[\r\t\f]/g, '')
      .replace(/:\s+/g, ':')
      .replace(/(,\s+)|(\s+,)|(\s+,\s+)/g, ',')
      .replace(/(;\s+)|(\s+;)|(\s+;\s+)/g, ';')
      .replace(/(\{\s+)|(\s+\{)|(\s+\{\s+)/g, '{')
      .replace(/(\}\s+)|(\s+\})|(\s+\}\s+)/g, '}')
    if (/[@:]/.test(line)) return line.replace(/\s{2,}/g, ' ').trim()
    else return line.replace(/\s(?![^{]*\})/g, '').trim()
  }).join('').replace(/\/\*.*\*\//g, '').trim()

  if (!opts.merge) return stripd

  // splittin
  var temp = []
  var splits = stripd.split('').reduce(function (acc, cur, i, arr) {
    if (cur === '{') {
      acc.push(temp.splice(0, temp.length).join(''))
      temp.push(cur)
    } else if (cur === '}') {
      temp.push(cur)
      acc.push(temp.splice(0, temp.length).join(''))
    } else {
      temp.push(cur)
    }
    return acc
  }, [])

  // merging duplicates in a map
  var selectormap = splits.reduce(function (acc, cur, i, arr) {
    if (i % 2 === 0 || i === 0) {
      if (acc.hasOwnProperty(cur)) {
        acc[cur] =
          acc[cur].slice(0, acc[cur].length - 1) +
          arr[i + 1].slice(1, arr[i + 1].length)
      } else {
        acc[cur] = arr[i + 1]
      }
    }
    return acc
  }, {})

  // reassemble
  return Array.prototype.concat.apply([], Object.entries(selectormap)).join('')
}

module.exports = crunchify
