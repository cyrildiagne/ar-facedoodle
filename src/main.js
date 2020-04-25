import facemesh from './facemesh'
import refmesh from './refmesh'
import three from './three'
import colorpicker from './colorpicker'

import { MDCSlider } from '@material/slider/dist/mdc.slider'

const useCamera = true

let video
let paused = false
let threeEl

function isMobile() {
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  return isAndroid || isiOS
}

async function setupCamera() {
  video = document.createElement('video')

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: isMobile() ? null : 640,
      height: isMobile() ? null : 640
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
  window.addEventListener('mousemove', onMouseMove)
}

function onMouseMove(evt) {
  const rect = threeEl.getBoundingClientRect()
  const x = evt.clientX - rect.x
  const y = evt.clientY - rect.y
  three.draw({ x, y })
}

function onMouseUp(evt) {
  three.end()
  window.removeEventListener('mousemove', onMouseMove)
}

function onTouchStart(evt) {
  window.addEventListener('touchmove', onTouchMove)
}

function onTouchMove(evt) {
  const rect = threeEl.getBoundingClientRect()
  const x = evt.touches[0].clientX - rect.x
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

function clear() {
  three.clear()
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
  window.addEventListener('mouseup', onMouseUp)
  threeEl.addEventListener('touchstart', onTouchStart)
  window.addEventListener('touchend', onTouchEnd)
  document.querySelector('.container').prepend(threeEl)

  // Launch update loop.
  update()
  window.addEventListener('blur', pause)
  window.addEventListener('focus', play)

  // Setup UI.
  colorpicker.init(color => (three.params.color = color))
  const slider = new MDCSlider(document.querySelector('.mdc-slider'))
  const thumb = document.querySelector('.mdc-slider__thumb')
  thumb.style.transform = 'scale(1)'
  const pin = document.querySelector('.mdc-slider__pin')
  pin.style.bottom = '10px'
  slider.listen('MDCSlider:input', () => {
    const thickness = parseInt(slider.value)
    thumb.style.transform = `scale(${1 + slider.value / 50})`
    pin.style.bottom = `${10 + slider.value}px`
    three.params.thickness = thickness
  })
  const clearEl = document.getElementById('clear')
  clearEl.addEventListener('click', clear)

  // Done.
  document.body.classList.remove('loading')
}

window.onload = () => {
  console.log('init')
  init()
}
