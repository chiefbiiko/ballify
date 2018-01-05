// app2.js

function init () {
  var p = document.createElement('p')
  var img1 = document.createElement('img')
  var img2 = document.createElement('img')
  img1.src = 'minime.jpg'
  img2.src = './some.svg'
  p.innerText = 'some fraud'
  document.body.appendChild(p)
  document.body.appendChild(img1)
  document.body.appendChild(img2)
}

window.onload = init
