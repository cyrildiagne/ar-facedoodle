import * as colorpicker from 'a-color-picker'

function init(callback) {
  const bt = document.getElementById('bt-picker')
  bt.addEventListener('click', btClicked)
  colorpicker.from('.picker').on('change', (picker, color) => {
    bt.style.backgroundColor = color
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
