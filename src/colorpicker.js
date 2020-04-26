import * as colorpicker from 'a-color-picker'

function init(callback) {
  const bt = document.getElementById('bt-picker')
  bt.addEventListener('click', btClicked)
  colorpicker.from('.picker').on('change', (picker, color) => {
    if (color === 'rgb(255, 255, 255)') {
      bt.style.color = 'black'
    } else {
      bt.style.color = color
    }
    const cursor = document.querySelector('.cursor')
    cursor.style.backgroundColor = bt.style.color
    callback(color)
  })
}

function btClicked() {
  const el = document.querySelector('.picker')
  el.style.display = 'block'

  const closeSurface = document.createElement('div')
  closeSurface.classList = 'close-color'
  document.body.prepend(closeSurface)
  closeSurface.addEventListener('click', () => {
    el.style.display = 'none'
    closeSurface.remove()
  })
}

export default {
  init
}
