
# regl-tween

A helper module that wraps regl buffers and automatically provides interpolation.

# Why?

This automatically computes tweened values in the shader so it's much faster than
doing it in the main javascript thread.

## installation

```
$ npm install --save regl-tween
```

## Example

```js
var regl = require('regl')();
var tween = require('regl-tween')(regl);

var COUNT = 10000;

// Helper function
var getRandomPositions = function (n) {
  var positions = [];
  for (var i = 0; i < n; i++) {
    positions.push([Math.random() * 2 - 1, Math.random() * 2 - 1]);
  }
  return positions;
}

// Pass in the initial data and optionally provide some customizations to
// the interpolation function.
var positionBuffer = tween.buffer(getRandomPositions(COUNT), { duration: 2000 });

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

### tween.buffer(data, [options])

Creates a new buffer with the provided data. Options are not required but
the following keys are supported:

* `duration` - animation duration in milliseconds
* `easing` - easing type. currently only `'linear'` is supported (see TODO's)

#### Example

```js
var tweenedBuffer = tween.buffer(myPositionArray, { duration: 500});
```

### tween(commandObject)

Returns a `regl` command, modified it to support the in-shader tweening. See the
[regl documentation](https://github.com/mikolalysenko/regl) for more info.

## TODO's / caveats

Things to know:

* This doesn't support anything besides linear interpolation at the moment. I plan to add this soon.
* This hangs if you interrupt an animation on a very large data set. The issue is that with the current implementation interrupted animations fall back to doing computation on the CPU and hence it ends up being slow.
