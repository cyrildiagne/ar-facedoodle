import * as facemesh from '@tensorflow-models/facemesh'
import * as tf from '@tensorflow/tfjs-core'

import { TRIANGULATION } from './triangulation'

let model
let canvas
let ctx

const state = {
  backend: 'webgl'
}

async function init(video) {
  await tf.setBackend(state.backend)
  model = await facemesh.load({ maxFaces: 1 })
}

async function update(video, debug = false) {
  const predictions = await model.estimateFaces(video)

  if (debug) {
    drawDebug(video, predictions)
  }

  if (predictions.length > 0) {
    return predictions[0]
  }
}

function drawDebug(video, predictions) {
  if (!ctx) {
    createDebug()
  }
  ctx.drawImage(
    video,
    0,
    0,
    video.videoWidth,
    video.videoHeight,
    0,
    0,
    canvas.width,
    canvas.height
  )
  if (predictions.length > 0) {
    predictions.forEach(prediction => {
      const keypoints = prediction.scaledMesh

      if (state.triangulateMesh) {
        for (let i = 0; i < TRIANGULATION.length / 3; i++) {
          const points = [
            TRIANGULATION[i * 3],
            TRIANGULATION[i * 3 + 1],
            TRIANGULATION[i * 3 + 2]
          ].map(index => keypoints[index])

          drawPath(ctx, points, true)
        }
      } else {
        for (let i = 0; i < keypoints.length; i++) {
          const x = keypoints[i][0]
          const y = keypoints[i][1]

          ctx.beginPath()
          ctx.arc(x, y, 1 /* radius */, 0, 2 * Math.PI)
          ctx.fill()
        }
      }
    })
  }
}

function createDebug(video) {
  canvas = document.createElement('canvas')
  canvas.width = video.width
  canvas.height = video.height

  ctx = canvas.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.fillStyle = '#32EEDB'
  ctx.strokeStyle = '#32EEDB'
  ctx.lineWidth = 0.5

  return canvas
}

function drawPath(ctx, points, closePath) {
  const region = new Path2D()
  region.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    region.lineTo(point[0], point[1])
  }

  if (closePath) {
    region.closePath()
  }
  ctx.stroke(region)
}

export default {
  init,
  update
}
