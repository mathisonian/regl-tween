
var camelCase = require('camelcase');
var eases = require('eases');
var glslEasings = require('./compiled-easings');

var nameMap = [
  ['quad-', 'quadratic-'],
  ['circ-', 'circular-'],
  ['expo-', 'exponential-'],
  ['quart-', 'quartic-'],
  ['quint-', 'quintic-']
];

var getEasingName = function (name) {
  return camelCase(name);
};

var getGLSLEasingName = function (name) {
  nameMap.forEach(function (r) {
    name = name.replace(r[0], r[1]);
  });
  return camelCase(name);
};

var getEasingFunction = function (name) {
  return eases[camelCase(name)];
};

var getShaderEasings = function (name) {
  return glslEasings;
};

module.exports = {
  getEasingFunction: getEasingFunction,
  getEasingName: getEasingName,
  getShaderEasings: getShaderEasings,
  getGLSLEasingName: getGLSLEasingName
};
