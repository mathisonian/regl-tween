/*global describe, it */

var expect = require('expect');
var regl = require('regl')(require('gl')(256, 256));
var easingCode = require('../src/easings/compiled-easings');
var tween = require('..')(regl);

describe('regl-tween-buffer tests', () => {
  it('should transform shader correctly', () => {
    var tweened = tween._initialize({
      vert: `
precision mediump float;
attribute vec3 color;
varying vec3 vcolor;
void main() {
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  vcolor = color;
}
      `,

      frag: `
precision mediump float;
varying vec3 vcolor;
void main() {
  gl_FragColor = vec4(vcolor, 1.0);
}
      `,

      attributes: {
        color: tween.buffer([])
      }
    });

    var expectedVert = `
precision mediump float;
attribute vec3 _rtb_attributes_previous_color;
attribute vec3 _rtb_attributes_next_color;
vec3 _rtb_attributes_current_color;
uniform float _rtb_attributes_t_color;
varying vec3 vcolor;
void main() {
  _rtb_attributes_current_color = mix(_rtb_attributes_previous_color, _rtb_attributes_next_color, quadraticInOut(_rtb_attributes_t_color));
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  vcolor = _rtb_attributes_current_color;
}
    `;

    expect(tweened.vert.trim()).toEqual(easingCode + '\n\n' + expectedVert.trim());
  });
});
