// app2.js

function init () {
  var p = document.createElement('p')
  var img = document.createElement('img')
  img.src = 'minime.jpg'
  p.innerText = 'some fraud'
  document.body.appendChild(p)
  document.body.appendChild(img)
}

window.onload = init
