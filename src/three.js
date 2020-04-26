import * as THREE from 'three'
import { OBJLoader } from './vendor/OBJLoader'
import simplify from 'simplify-js'

let camera
let scene
let renderer
let videoTexture
let baseMesh
let raycaster
let currPlane

const planes = []
const planeWidth = 1024
const planeHeight = 1024

const params = {
  debug: false,
  color: '#ffffff',
  thickness: 20,
  smooth: 1.5
}

async function init(video) {
  // Initialize camera.
  const width = video ? video.width : 640
  const height = video ? video.height : 640
  const ratio = width / height
  const fov = 50
  const near = 1
  const far = 5000
  camera = new THREE.PerspectiveCamera(fov, ratio, near, far)
  camera.position.z = height
  camera.position.x = -width / 2
  camera.position.y = -height / 2

  // Initialize renderer.
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)

  // Initialize scene.
  scene = new THREE.Scene()
  if (video) {
    addVideoSprite(video)
  }

  // Init Raycaster.
  raycaster = new THREE.Raycaster()

  // addDebugMesh()
  await addFBXMesh()

  return renderer.domElement
}

function alignPlane(plane) {
  const vertices = baseMesh.geometry.vertices
  const centroid = new THREE.Vector3()
  plane.mesh.position.set(0, 0, 0)
  plane.mesh.lookAt(plane.face.normal)
  centroid.add(vertices[plane.face.a])
  centroid.add(vertices[plane.face.b])
  centroid.add(vertices[plane.face.c])
  centroid.divideScalar(3)
  const centroidWithOffset = centroid
    .clone()
    .add(plane.face.normal.multiplyScalar(-10))
  plane.mesh.position.copy(centroidWithOffset)
  if (params.debug) {
    plane.debug.position.copy(plane.mesh.position)
    plane.debug.rotation.copy(plane.mesh.rotation)
  }
}

function update(facemesh) {
  // Update the video sprite.
  if (videoTexture) {
    videoTexture.needsUpdate = true
  }

  if (baseMesh) {
    for (let i = 0; i < facemesh.length; i++) {
      const [x, y, z] = facemesh[i]
      baseMesh.geometry.vertices[i].set(x - 640, -y, -z)
    }
    baseMesh.geometry.verticesNeedUpdate = true
    baseMesh.geometry.normalsNeedUpdate = true
    baseMesh.geometry.computeBoundingSphere()
    baseMesh.geometry.computeFaceNormals()
    baseMesh.geometry.computeVertexNormals()
  }

  for (const plane of planes) {
    alignPlane(plane)
  }

  // Render.
  renderer.render(scene, camera)
}

function addVideoSprite(video) {
  videoTexture = new THREE.Texture(video)
  videoTexture.minFilter = THREE.LinearFilter
  const videoSprite = new THREE.Sprite(
    new THREE.MeshBasicMaterial({
      map: videoTexture,
      depthWrite: false
    })
  )
  const width = video.width
  const height = video.height
  videoSprite.center.set(0.5, 0.5)
  videoSprite.scale.set(width, height, 1)
  videoSprite.position.copy(camera.position)
  videoSprite.position.z = 0
  scene.add(videoSprite)
}

function addFBXMesh() {
  const loader = new OBJLoader()
  return new Promise((resolve, reject) => {
    loader.load('facemesh.obj', obj => {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const mat = new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide
          })
          if (!params.debug) {
            mat.transparent = true
            mat.opacity = 0
          }
          baseMesh = new THREE.Mesh(child.geometry, mat)
          scene.add(baseMesh)
          resolve()
        }
      })
    })
  })
}

function draw(pt) {
  // Raycase draw point.
  const x = (pt.x / renderer.domElement.clientWidth) * 2 - 1
  const y = -(pt.y / renderer.domElement.clientHeight) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
  if (currPlane) {
    const intersects = raycaster.intersectObject(currPlane.mesh)
    if (intersects.length) {
      // Add intersection UV to the list of points.
      let { x, y } = intersects[0].uv
      x = x * planeWidth
      y = (1 - y) * planeHeight
      currPlane.points.push({ x, y })

      // Simplify path to smooth out the line.
      const pts = simplify(currPlane.points, params.smooth)
      // const pts = currPlane.points

      // Draw using Quadratic Curve
      const ctx = currPlane.ctx
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      // for (let i = 0; i < pts.length - 2; i++) {
      //   ctx.beginPath()
      //   ctx.moveTo(pts[i].x, pts[i].y)
      //   const pct = (i + 1) / pts.length
      //   ctx.lineWidth = Math.sin(pct * Math.PI) * params.thickness
      //   ctx.lineTo(pts[i + 1].x, pts[i + 1].y)
      //   ctx.stroke()
      // }

      if (currPlane.points.length < 3) {
        ctx.arc(x, y, params.thickness / 2, 0, Math.PI * 2, !0)
        ctx.fill()
        ctx.closePath()
      } else {
        ctx.beginPath()
        ctx.lineWidth = params.thickness
        let i = 0
        ctx.moveTo(pts[i].x, pts[i].y)
        for (i; i < pts.length - 2; i++) {
          const c = {
            x: (pts[i].x + pts[i + 1].x) / 2,
            y: (pts[i].y + pts[i + 1].y) / 2
          }
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, c.x, c.y)
        }
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y)
        ctx.stroke()
      }
      currPlane.mesh.material.map.needsUpdate = true
    }
  } else {
    baseMesh.geometry.verticesNeedUpdate = true
    baseMesh.geometry.normalsNeedUpdate = true
    baseMesh.geometry.computeBoundingSphere()
    baseMesh.geometry.computeFaceNormals()
    baseMesh.geometry.computeVertexNormals()

    const intersects = raycaster.intersectObject(baseMesh)
    if (intersects.length) {
      const face = intersects[0].face
      const position = intersects[0].point
      const uv = intersects[0].uv
      const plane = createDrawingPlane(position, face, uv)
      planes.push(plane)
      scene.add(plane.mesh)
      currPlane = plane
    }
  }
}

function end() {
  currPlane = null
}

function undo() {
  end()
  if (planes.length) {
    const plane = planes.pop()
    scene.remove(plane.mesh)
    scene.remove(plane.debug)
  }
}

function clear() {
  end()
  for (const plane of planes) {
    scene.remove(plane.mesh)
    scene.remove(plane.debug)
  }
  planes.splice(0, planes.length)
}

function setDebug(value) {
  params.debug = value
  if (params.debug) {
    baseMesh.material.transparent = false
    baseMesh.material.opacity = 1
    for (const plane of planes) {
      scene.add(plane.debug)
    }
  } else {
    baseMesh.material.transparent = true
    baseMesh.material.opacity = 0
    for (const plane of planes) {
      scene.remove(plane.debug)
    }
  }
}

function isOverFace(pt) {
  // Raycase draw point.
  const x = (pt.x / renderer.domElement.clientWidth) * 2 - 1
  const y = -(pt.y / renderer.domElement.clientHeight) * 2 + 1
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
  const intersects = raycaster.intersectObject(baseMesh)
  if (intersects.length) {
    return true
  }
  return false
}

function createDrawingPlane(position, face, uv) {
  const width = planeWidth
  const height = planeHeight
  // Create Canvas.
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = params.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = params.thickness
  // Create Texture.
  const texture = new THREE.CanvasTexture(canvas)
  // Create Mesh.
  const geom = new THREE.PlaneGeometry(width / 2, height / 2, 1, 1)
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
  })
  const mesh = new THREE.Mesh(geom, mat)

  // Create an object that will contain some debug helpers.
  const debugObj = new THREE.Object3D()

  const plane = {
    mesh,
    face,
    ctx,
    points: [],
    debug: debugObj
  }
  alignPlane(plane)

  // Add Debug Helper.
  const helper = new THREE.AxesHelper(50)
  debugObj.add(helper)
  // Add Debug Grid.
  const pgeom = new THREE.PlaneGeometry(30, 30, 3, 3)
  const pmat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    wireframe: true
  })
  const debugPlane = new THREE.Mesh(pgeom, pmat)
  debugObj.add(debugPlane)

  if (params.debug) {
    debugObj.lookAt(face.normal)
    debugObj.position.copy(plane.mesh.position)
    scene.add(debugObj)
  }

  return plane
}

export default {
  init,
  update,
  draw,
  end,
  undo,
  clear,
  params,
  isOverFace,
  setDebug
}
