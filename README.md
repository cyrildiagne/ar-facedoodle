# AR Face Doodle

Doodle on your face with AR directly from the web browser thanks to
[Tensorflow.js](https://www.tensorflow.org/js),
[FaceMesh](https://github.com/tensorflow/tfjs-models/tree/master/facemesh)
and [Three.js](https://threejs.org/).

![debug](doc/debug.gif)

Demo: [https://cyrildiagne.github.io/ar-facedoodle](https://cyrildiagne.github.io/ar-facedoodle)

## Setup

```
npm install && npm start
```

## Thanks and acknowledgement

- [tensorflow/tfjs-models facemesh](https://github.com/tensorflow/tfjs-models/tree/master/facemesh) For the face detection model
- [shawticus/facemesh-threejs](https://github.com/shawticus/facemesh-threejs) For the facemesh OBJ model
- [mourner/simplify.js](https://github.com/mourner/simplify-js) For the line smoothing
- [mrdoob/three.js](https://github.com/mrdoob/three.js) For the 3D engine
