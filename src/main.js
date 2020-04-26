import facemesh from './facemesh'
import refmesh from './refmesh'
import three from './three'
import colorpicker from './colorpicker'

import { MDCSlider } from '@material/slider/dist/mdc.slider'

const useCamera = true

let video
let threeEl
let cursorEl
let paused = false
let drawing = false

async function setupCamera() {
  video = document.createElement('video')

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: 640,
      height: 640
    }
  })
  video.srcObject = stream

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video)
    }
  })
}

async function update() {
  // Update facemesh.
  if (useCamera) {
    const face = await facemesh.update(video)
    // Update three scene.
    if (face) {
      three.update(face.scaledMesh)
    }
  } else {
    three.update(refmesh.debugPoints)
  }
  // Call for RAF if scene is not paused.
  if (!paused) {
    window.requestAnimationFrame(update)
  }
}

function onMouseDown(evt) {
  drawing = true
}

function onMouseMove(evt) {
  const rect = threeEl.getBoundingClientRect()
  const x = rect.width - (evt.clientX - rect.x)
  const y = evt.clientY - rect.y
  cursorEl.style.left = evt.clientX + 'px'
  cursorEl.style.top = evt.clientY + 'px'
  if (drawing) {
    three.draw({ x, y })
  } else {
    const isOver = three.isOverFace({ x, y })
    if (isOver) {
      document.body.classList.add('hover-face')
    } else {
      if (document.body.classList.contains('hover-face')) {
        document.body.classList.remove('hover-face')
      }
    }
  }
}

function onMouseUp(evt) {
  three.end()
  drawing = false
  document.body.classList.remove('hover-face')
}

function onTouchStart(evt) {
  window.addEventListener('touchmove', onTouchMove)
}

function onTouchMove(evt) {
  const rect = threeEl.getBoundingClientRect()
  const x = rect.width - (evt.touches[0].clientX - rect.x)
  const y = evt.touches[0].clientY - rect.y
  three.draw({ x, y })
}

function onTouchEnd(evt) {
  three.end()
  window.removeEventListener('touchmove', onTouchMove)
}

function play() {
  paused = false
  window.requestAnimationFrame(update)
  document.body.classList.remove('paused')
}

function pause() {
  paused = true
  document.body.classList.add('paused')
}

async function init() {
  if (useCamera) {
    // Initialize camera.
    console.log('setting up camera...')
    await setupCamera()
    video.play()
    video.width = video.videoWidth
    video.height = video.videoHeight

    // Initialize face mesh.
    console.log('setting up facemesh...')
    await facemesh.init(video)
  }

  // Initialize threejs scene.
  console.log('setting up threejs...')
  threeEl = await three.init(video)
  threeEl.classList.add('three-canvas')
  threeEl.addEventListener('mousedown', onMouseDown)
  threeEl.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  threeEl.addEventListener('touchstart', onTouchStart)
  window.addEventListener('touchend', onTouchEnd)
  document.querySelector('.container').prepend(threeEl)

  // Launch update loop.
  update()
  window.addEventListener('blur', pause)
  window.addEventListener('focus', play)

  // Setup UI.
  // Color picker
  colorpicker.init(color => (three.params.color = color))
  // Slider.
  const slider = new MDCSlider(document.querySelector('.mdc-slider'))
  const thumb = document.querySelector('.mdc-slider__thumb')
  thumb.style.transform = 'scale(1)'
  const pin = document.querySelector('.mdc-slider__pin')
  pin.style.bottom = '10px'
  slider.listen('MDCSlider:input', () => {
    const thickness = parseInt(slider.value)
    thumb.style.transform = `scale(${1 + thickness / 50})`
    pin.style.bottom = `${10 + thickness}px`
    three.params.thickness = thickness
    // Update cursor size.
    const size = Math.max(2, thickness / 2)
    cursorEl.style.width = size + 'px'
    cursorEl.style.height = size + 'px'
  })
  // Undo button.
  const undoEl = document.getElementById('undo')
  undoEl.addEventListener('click', () => three.undo())
  // Clear button.
  const clearEl = document.getElementById('clear')
  clearEl.addEventListener('click', () => three.clear())
  // Debug button.
  const debugEl = document.getElementById('debug')
  debugEl.addEventListener('click', () => three.setDebug(!three.params.debug))
  // Info bt.
  const infoBt = document.getElementById('bt-info')
  const infoEl = document.getElementById('info')
  infoBt.addEventListener('click', () => {
    infoEl.classList.toggle('show')
  })
  infoEl.addEventListener('click', () => {
    infoEl.classList.remove('show')
  })

  // Setup cursor.
  cursorEl = document.createElement('div')
  cursorEl.classList.add('cursor')
  document.body.append(cursorEl)

  // Done.
  document.body.classList.remove('loading')
}

window.onload = () => {
  console.log('init')
  init()
}
