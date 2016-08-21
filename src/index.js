var strip = require('strip-comments');
var lerp = require('lerp');
var easings = require('./easings');

var namespace = '_rtb';

var getPreviousName = function (name, type) {
  return namespace + '_' + type + '_previous_' + name;
};

var getCurrentName = function (name, type) {
  return namespace + '_' + type + '_current_' + name;
};

var getNextName = function (name, type) {
  return namespace + '_' + type + '_next_' + name;
};

var getTimeName = function (name, type) {
  return namespace + '_' + type + '_t_' + name;
};

var transformShader = function (name, shader, type, ease) {
  //
  // [X] Strip comments
  // [X] Replace declaration with prev / next / current declarations
  // [X] Initialize timestamp
  // [X] Initialize current in the main() function
  // [X] Replace all old usages with current
  //

  var easingName = easings.getGLSLEasingName(ease);
  var glslEasings = easings.getShaderEasings();

  shader = strip(shader);
  var prev = getPreviousName(name, type);
  var next = getNextName(name, type);
  var current = getCurrentName(name, type);
  var t = getTimeName(name, type);

  // first occurence of name:
  var re = new RegExp(';([^;]*' + name + '[^;]*;)');
  var found = shader.match(re);

  if (!found || found.length < 2) {
    return shader;
  }

  var invocation = found[1];
  var prevDeclare = invocation.replace(name, prev);
  var nextDeclare = invocation.replace(name, next);
  var currentDeclare = '\n' + invocation.replace(name, current).replace('attribute', '').replace('uniform', '').trim();
  var timeDeclare = '\nuniform float ' + t + ';';

  var replaceString = prevDeclare + nextDeclare + currentDeclare + timeDeclare;

  shader = shader.replace(invocation, replaceString);

  // add the mix() call
  re = new RegExp('main\\s*\\(\\s*\\)\\s*{');
  found = shader.match(re);

  if (found && found.length) {
    var mixString = current + ' = ' + 'mix(' + prev + ', ' + next + ', ' + easingName + '(' + t + '));';
    shader = shader.replace(found[0], found[0] + '\n  ' + mixString);
  }

  // replace all the old names
  re = new RegExp('\\b' + name + '\\b', 'g');
  shader = shader.replace(re, current);
  shader = glslEasings + '\n' + shader;

  return shader;
};

var TweenBuffer = function (data, options) {
  this.data = data;
  this.previousData = data;
  this.options = Object.assign({}, {
    duration: 750,
    ease: 'quad-in-out'
  }, options || {});
};

module.exports = function (regl) {
  var tween = function (commandObject) {
    commandObject.uniforms = commandObject.uniforms || {};
    commandObject.attributes = commandObject.attributes || {};
    commandObject.vert = commandObject.vert || '';
    commandObject.frag = commandObject.frag || '';
    if (!commandObject.vert || !commandObject.frag) {
      throw new Error('Must provide vert and frag shaders!');
    }

    var tweenedProps = {
      uniforms: [],
      attributes: []
    };
    var buffers = {
      uniforms: {},
      attributes: {}
    };
    var tweenBuffers = {
      uniforms: {},
      attributes: {}
    };
    var timers = {
      uniforms: {},
      attributes: {}
    };
    var tweenFlags = {
      uniforms: {},
      attributes: {}
    };
    var startTimes = {
      uniforms: {},
      attributes: {}
    };

    var tweenBufferUpdate = function (data) {
      var timer = timers[this.type][this.key];

      if (timer < 1.0) {
        var eased = easings.getEasingFunction(this.options.ease)(timer);
        var previousData = this.previousData;
        this.previousData = this.data.map(function (d, i) {
          return d.map(function (elt, j) {
            return lerp(previousData[i][j], elt, eased);
          });
        });
      } else {
        this.previousData = this.data;
      }

      this.data = data;
      buffers[this.type][this.key].previous({
        usage: 'dynamic',
        data: this.previousData
      });

      buffers[this.type][this.key].next({
        usage: 'dynamic',
        data: data
      });
      tweenFlags[this.type][this.key] = true;
    };

    var initialize = function (type) {
      Object.keys(commandObject[type] || {}).filter(function (key) {
        return commandObject[type][key] instanceof TweenBuffer;
      }).map(function (key) {
        tweenedProps[type].push(key);
        var tweenBuffer = commandObject[type][key];
        tweenBuffer.type = type;
        tweenBuffer.key = key;
        tweenBuffer.update = tweenBufferUpdate;
        tweenBuffers[type][key] = tweenBuffer;
        timers[type][key] = 1.0;
        tweenFlags[type][key] = false;
        buffers[type][key] = {
          previous: regl.buffer({
            usage: 'dynamic',
            data: tweenBuffer.data
          }),
          next: regl.buffer({
            usage: 'dynamic',
            data: tweenBuffer.data
          })
        };
      });
    };

    initialize('attributes');
    initialize('uniforms');

    var transform = function (type) {
      tweenedProps[type].forEach(function (attr) {
        var tweenBuffer = tweenBuffers[type][attr];
        var duration = tweenBuffer.options.duration;
        commandObject.vert = transformShader(attr, commandObject.vert || '', type, tweenBuffer.options.ease);
        delete commandObject.attributes[attr];
        commandObject[type][getPreviousName(attr, type)] = buffers[type][attr].previous;
        commandObject[type][getNextName(attr, type)] = buffers[type][attr].next;
        commandObject.uniforms[getTimeName(attr, type)] = function (context, props, batchId) {
          if (tweenFlags[type][attr]) {
            timers[type][attr] = 0.0;
            startTimes[type][attr] = context.time;
          }

          // we go up to maxT to allow for some random delays
          var startTime = startTimes[type][attr];
          var t = timers[type][attr];
          if (t < 1.0) {
            t = Math.min(1.0, 1000 * (context.time - startTime) / duration);
          }

          timers[type][attr] = t;
          tweenFlags[type][attr] = false;
          return t;
        };
      });
    };

    transform('attributes');
    transform('uniforms');

    return regl(commandObject);
  };

  tween.buffer = function (data, options) {
    return new TweenBuffer(data, options);
  };

  return tween;
};
