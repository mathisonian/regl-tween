
# regl-tween

A helper module that wraps [regl](https://github.com/mikolalysenko/regl/) buffers and automatically provides interpolation.

### Why?

This automatically computes tweened values in the shader so it's much faster than
doing it in the main javascript thread. See it running with 1.25 million points: https://mathisonian.github.io/regl-tween/

## installation

```
$ npm install --save regl-tween
```

## Example

```js
var regl = require('regl')();
var tween = require('regl-tween')(regl);

var COUNT = 10000;

// Pass in the initial data and optionally provide some customizations to
// the interpolation function.
var positionBuffer = tween.buffer(getRandomPositions(COUNT), { duration: 1000 });

// Wrap your command in tween() instead of in regl()
// A modified regl command is returned.
const drawParticles = tween({
  vert: `
precision mediump float;
attribute vec2 position;
uniform float pointSize;

void main() {
  gl_PointSize = pointSize;
  gl_Position = vec4(position, 0, 1);
}`,
  frag: `
precision lowp float;
void main() {
  if (length(gl_PointCoord.xy - 0.5) > 0.5) {
    discard;
  }
  gl_FragColor = vec4(1.0, 0.0, 0.0, 0.8);
}`,

  attributes: {
    position: positionBuffer,
  },

  uniforms: {
    pointSize: 6,
  },

  count: COUNT,
  primitive: 'points'
})


setInterval(() => {
  positionBuffer.update(getRandomPositions(COUNT));
}, 1000);

regl.frame(() => {
  drawParticles();
})
```

## API

### tween(commandObject)

Returns a `regl` command, modified it to support the in-shader tweening. See the
[regl documentation](https://github.com/mikolalysenko/regl) for more info.

### tween.buffer(data, [options])

Creates a new buffer with the provided data. Options are not required but
the following keys are supported:

* `duration` - animation duration in milliseconds. Defaults to 750 milliseconds.
* `easing` - easing type. Defaults to `quad-in-out`. Any function in https://github.com/mattdesl/eases is a valid input option. e.g. `linear`, `expo-in-out`, etc.

#### Example

```js
var tweenedBuffer = tween.buffer(myPositionArray, { duration: 500, ease: 'expo-in-out'});
```

### tween.buffer.update(data)

Updates the data on an existing buffer.

#### Example

```js
var tweenedBuffer = tween.buffer(myPositionArray, { duration: 500});
tweenedBuffer.update(newPositionArray);
```

## TODO's / caveats

Things to know:

* This hangs if you interrupt an animation on a very large data set. The issue is that with the current implementation interrupted animations fall back to doing computation on the CPU and hence it ends up being slow.
