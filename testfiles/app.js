// app.js

function init () {
  var p = document.createElement('p')
  p.innerText = 'some fraud'
  document.body.appendChild(p)
}

window.onload = init
