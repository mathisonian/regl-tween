var regl = require('regl')();
var tween = require('..')(regl);

var COUNT = 1250000;

var count = 0;
var getRandomPositions = function (n) {
  var positions = [];
  for (var i = 0; i < n; i++) {
    if (count % 5 === 0) {
      positions.push([Math.random() * 2 - 1, Math.random() * 2 - 1]);
    } else if (count % 5 === 1) {
      positions.push([Math.random(), Math.random() * 2 - 1]);
    } else if (count % 5 === 2) {
      positions.push([Math.random() * 2 - 1, Math.random()]);
    } else if (count % 5 === 3) {
      positions.push([Math.random() * -1, Math.random() * -1]);
    } else if (count % 5 === 4) {
      positions.push([Math.random(), Math.random()]);
    }
  }
  count++;
  return positions;
};

var positionBuffer = tween.buffer(getRandomPositions(COUNT), { duration: 1000, ease: 'expo-in-out' });

const drawParticles = tween({
  vert: `
precision lowp float;
attribute vec2 position;
uniform float pointSize;

void main() {
  gl_PointSize = pointSize;
  gl_Position = vec4(position, 0, 1);
}
  `,
  frag: `
precision lowp float;
void main() {
  if (length(gl_PointCoord.xy - 0.5) > 0.5) {
    discard;
  }
  gl_FragColor = vec4(1.0, 0.0, 0.0, 0.3);
}
`,

  attributes: {
    position: positionBuffer
  },

  uniforms: {
    pointSize: 2
  },

  count: COUNT,
  primitive: 'points'
});

setInterval(() => {
  positionBuffer.update(getRandomPositions(COUNT));
}, 2000);

regl.frame(() => {
  drawParticles();
});
