// app.js

function init () {
  var txt = document.createElement('p')
  txt.innerText = 'some fraud'
  document.body.appendChild(txt)
}

window.onload = init
