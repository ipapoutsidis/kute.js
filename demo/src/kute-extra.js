/*!
* KUTE.js Extra v2.1.3 (http://thednp.github.io/kute.js)
* Copyright 2015-2021 © thednp
* Licensed under MIT (https://github.com/thednp/kute.js/blob/master/LICENSE)
*/
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.KUTE = factory());
})(this, (function () { 'use strict';

  var CubicBezier = function CubicBezier(p1x, p1y, p2x, p2y, functionName) {
    var this$1$1 = this;

    // pre-calculate the polynomial coefficients
    // First and last control points are implied to be (0,0) and (1.0, 1.0)
    this.cx = 3.0 * p1x;
    this.bx = 3.0 * (p2x - p1x) - this.cx;
    this.ax = 1.0 - this.cx - this.bx;

    this.cy = 3.0 * p1y;
    this.by = 3.0 * (p2y - p1y) - this.cy;
    this.ay = 1.0 - this.cy - this.by;

    var BezierEasing = function (t) { return this$1$1.sampleCurveY(this$1$1.solveCurveX(t)); };

    // this function needs a name
    Object.defineProperty(BezierEasing, 'name', { writable: true });
    BezierEasing.name = functionName || ("cubic-bezier(" + ([p1x, p1y, p2x, p2y]) + ")");

    return BezierEasing;
  };

  CubicBezier.prototype.sampleCurveX = function sampleCurveX (t) {
    return ((this.ax * t + this.bx) * t + this.cx) * t;
  };

  CubicBezier.prototype.sampleCurveY = function sampleCurveY (t) {
    return ((this.ay * t + this.by) * t + this.cy) * t;
  };

  CubicBezier.prototype.sampleCurveDerivativeX = function sampleCurveDerivativeX (t) {
    return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
  };

  CubicBezier.prototype.solveCurveX = function solveCurveX (x) {
    var t0;
    var t1;
    var t2;
    var x2;
    var d2;
    var i;
    var epsilon = 1e-5; // Precision

    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 32; i += 1) {
      x2 = this.sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) { return t2; }
      d2 = this.sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < epsilon) { break; }
      t2 -= x2 / d2;
    }

    // No solution found - use bi-section
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;

    if (t2 < t0) { return t0; }
    if (t2 > t1) { return t1; }

    while (t0 < t1) {
      x2 = this.sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) { return t2; }
      if (x > x2) { t0 = t2; }
      else { t1 = t2; }

      t2 = (t1 - t0) * 0.5 + t0;
    }

    // Give up
    return t2;
  };

  var KUTE = {};

  var Tweens = [];

  var globalObject;

  if (typeof global !== 'undefined') { globalObject = global; }
  else if (typeof window !== 'undefined') { globalObject = window.self; }
  else { globalObject = {}; }

  var globalObject$1 = globalObject;

  // KUTE.js INTERPOLATE FUNCTIONS
  // =============================
  var Interpolate = {};

  // schedule property specific function on animation start
  // link property update function to KUTE.js execution context
  var onStart = {};

  // Include a performance.now polyfill.
  // source https://github.com/tweenjs/tween.js/blob/master/src/Now.ts
  var now;

  // In node.js, use process.hrtime.
  // eslint-disable-next-line
  // @ts-ignore
  if (typeof self === 'undefined' && typeof process !== 'undefined' && process.hrtime) {
    now = function () {
      // eslint-disable-next-line
  		// @ts-ignore
      var time = process.hrtime();

      // Convert [seconds, nanoseconds] to milliseconds.
      return time[0] * 1000 + time[1] / 1000000;
    };
  } else if (typeof self !== 'undefined' && self.performance !== undefined && self.performance.now !== undefined) {
    // In a browser, use self.performance.now if it is available.
    // This must be bound, because directly assigning this function
    // leads to an invocation exception in Chrome.
    now = self.performance.now.bind(self.performance);
  } else if (typeof Date !== 'undefined' && Date.now) {
    // Use Date.now if it is available.
    now = Date.now;
  } else {
    // Otherwise, use 'new Date().getTime()'.
    now = function () { return new Date().getTime(); };
  }

  var now$1 = now;

  var Time = {};
  Time.now = now$1;
  // const that = window.self || window || {};
  // Time.now = that.performance.now.bind(that.performance);

  var Tick = 0;

  var Ticker = function (time) {
    var i = 0;
    while (i < Tweens.length) {
      if (Tweens[i].update(time)) {
        i += 1;
      } else {
        Tweens.splice(i, 1);
      }
    }
    Tick = requestAnimationFrame(Ticker);
  };

  // stop requesting animation frame
  function stop() {
    setTimeout(function () { // re-added for #81
      if (!Tweens.length && Tick) {
        cancelAnimationFrame(Tick);
        Tick = null;
        Object.keys(onStart).forEach(function (obj) {
          if (typeof (onStart[obj]) === 'function') {
            if (KUTE[obj]) { delete KUTE[obj]; }
          } else {
            Object.keys(onStart[obj]).forEach(function (prop) {
              if (KUTE[prop]) { delete KUTE[prop]; }
            });
          }
        });

        Object.keys(Interpolate).forEach(function (i) {
          if (KUTE[i]) { delete KUTE[i]; }
        });
      }
    }, 64);
  }

  // KUTE.js render update functions
  // ===============================
  var Render = {
    Tick: Tick, Ticker: Ticker, Tweens: Tweens, Time: Time,
  };
  Object.keys(Render).forEach(function (blob) {
    if (!KUTE[blob]) {
      KUTE[blob] = blob === 'Time' ? Time.now : Render[blob];
    }
  });

  globalObject$1._KUTE = KUTE;

  var supportedProperties = {};

  var defaultValues = {};

  var defaultOptions = {
    duration: 700,
    delay: 0,
    easing: 'linear',
  };

  // used in preparePropertiesObject
  var prepareProperty = {};

  // check current property value when .to() method is used
  var prepareStart = {};

  // checks for differences between the processed start and end values,
  // can be set to make sure start unit and end unit are same,
  // stack transforms, process SVG paths,
  // any type of post processing the component needs
  var crossCheck = {};

  // schedule property specific function on animation complete
  var onComplete = {};

  // link properties to interpolate functions
  var linkProperty = {};

  var Objects = {
    supportedProperties: supportedProperties,
    defaultValues: defaultValues,
    defaultOptions: defaultOptions,
    prepareProperty: prepareProperty,
    prepareStart: prepareStart,
    crossCheck: crossCheck,
    onStart: onStart,
    onComplete: onComplete,
    linkProperty: linkProperty,
  };

  // util - a general object for utils like rgbToHex, processEasing
  var Util = {};

  function add (tw) { return Tweens.push(tw); }

  function remove (tw) {
    var i = Tweens.indexOf(tw);
    if (i !== -1) { Tweens.splice(i, 1); }
  }

  function getAll () { return Tweens; }

  function removeAll () { Tweens.length = 0; }

  function linkInterpolation() {
    var this$1$1 = this;
   // DON'T change
    Object.keys(linkProperty).forEach(function (component) {
      var componentLink = linkProperty[component];
      var componentProps = supportedProperties[component];

      Object.keys(componentLink).forEach(function (fnObj) {
        if (typeof (componentLink[fnObj]) === 'function' // ATTR, colors, scroll, boxModel, borderRadius
            && Object.keys(this$1$1.valuesEnd).some(function (i) { return (componentProps && componentProps.includes(i))
            || (i === 'attr' && Object.keys(this$1$1.valuesEnd[i]).some(function (j) { return componentProps && componentProps.includes(j); })); })) {
          if (!KUTE[fnObj]) { KUTE[fnObj] = componentLink[fnObj]; }
        } else {
          Object.keys(this$1$1.valuesEnd).forEach(function (prop) {
            var propObject = this$1$1.valuesEnd[prop];
            if (propObject instanceof Object) {
              Object.keys(propObject).forEach(function (i) {
                if (typeof (componentLink[i]) === 'function') { // transformCSS3
                  if (!KUTE[i]) { KUTE[i] = componentLink[i]; }
                } else {
                  Object.keys(componentLink[fnObj]).forEach(function (j) {
                    if (componentLink[i] && typeof (componentLink[i][j]) === 'function') { // transformMatrix
                      if (!KUTE[j]) { KUTE[j] = componentLink[i][j]; }
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  }

  var Internals = {
    add: add,
    remove: remove,
    getAll: getAll,
    removeAll: removeAll,
    stop: stop,
    linkInterpolation: linkInterpolation,
  };

  // getInlineStyle - get transform style for element from cssText for .to() method
  function getInlineStyle(el) {
    // if the scroll applies to `window` it returns as it has no styling
    if (!el.style) { return false; }
    // the cssText | the resulting transform object
    var css = el.style.cssText.replace(/\s/g, '').split(';');
    var transformObject = {};
    var arrayFn = ['translate3d', 'translate', 'scale3d', 'skew'];

    css.forEach(function (cs) {
      if (/transform/i.test(cs)) {
        // all transform properties
        var tps = cs.split(':')[1].split(')');
        tps.forEach(function (tpi) {
          var tpv = tpi.split('(');
          var tp = tpv[0];
          // each transform property
          var tv = tpv[1];
          if (!/matrix/.test(tp)) {
            transformObject[tp] = arrayFn.includes(tp) ? tv.split(',') : tv;
          }
        });
      }
    });

    return transformObject;
  }

  // getStyleForProperty - get computed style property for element for .to() method
  function getStyleForProperty(elem, propertyName) {
    var styleAttribute = elem.style;
    var computedStyle = getComputedStyle(elem) || elem.currentStyle;
    var styleValue = styleAttribute[propertyName] && !/auto|initial|none|unset/.test(styleAttribute[propertyName])
      ? styleAttribute[propertyName]
      : computedStyle[propertyName];
    var result = defaultValues[propertyName];

    if (propertyName !== 'transform' && (propertyName in computedStyle || propertyName in styleAttribute)) {
      result = styleValue;
    }

    return result;
  }

  // prepareObject - returns all processed valuesStart / valuesEnd
  function prepareObject(obj, fn) {
    var this$1$1 = this;
   // this, props object, type: start/end
    var propertiesObject = fn === 'start' ? this.valuesStart : this.valuesEnd;

    Object.keys(prepareProperty).forEach(function (component) {
      var prepareComponent = prepareProperty[component];
      var supportComponent = supportedProperties[component];

      Object.keys(prepareComponent).forEach(function (tweenCategory) {
        var transformObject = {};

        Object.keys(obj).forEach(function (tweenProp) {
          // scroll, opacity, other components
          if (defaultValues[tweenProp] && prepareComponent[tweenProp]) {
            propertiesObject[tweenProp] = prepareComponent[tweenProp]
              .call(this$1$1, tweenProp, obj[tweenProp]);

          // transform
          } else if (!defaultValues[tweenCategory] && tweenCategory === 'transform'
            && supportComponent.includes(tweenProp)) {
            transformObject[tweenProp] = obj[tweenProp];

          // allow transformFunctions to work with preprocessed input values
          } else if (!defaultValues[tweenProp] && tweenProp === 'transform') {
            propertiesObject[tweenProp] = obj[tweenProp];

          // colors, boxModel, category
          } else if (!defaultValues[tweenCategory]
            && supportComponent && supportComponent.includes(tweenProp)) {
            propertiesObject[tweenProp] = prepareComponent[tweenCategory]
              .call(this$1$1, tweenProp, obj[tweenProp]);
          }
        });

        // we filter out older browsers by checking Object.keys
        if (Object.keys(transformObject).length) {
          propertiesObject[tweenCategory] = prepareComponent[tweenCategory]
            .call(this$1$1, tweenCategory, transformObject);
        }
      });
    });
  }

  // getStartValues - returns the startValue for to() method
  function getStartValues() {
    var this$1$1 = this;

    var startValues = {};
    var currentStyle = getInlineStyle(this.element);

    Object.keys(this.valuesStart).forEach(function (tweenProp) {
      Object.keys(prepareStart).forEach(function (component) {
        var componentStart = prepareStart[component];

        Object.keys(componentStart).forEach(function (tweenCategory) {
          // clip, opacity, scroll
          if (tweenCategory === tweenProp && componentStart[tweenProp]) {
            startValues[tweenProp] = componentStart[tweenCategory]
              .call(this$1$1, tweenProp, this$1$1.valuesStart[tweenProp]);
          // find in an array of properties
          } else if (supportedProperties[component]
            && supportedProperties[component].includes(tweenProp)) {
            startValues[tweenProp] = componentStart[tweenCategory]
              .call(this$1$1, tweenProp, this$1$1.valuesStart[tweenProp]);
          }
        });
      });
    });

    // stack transformCSS props for .to() chains
    // also add to startValues values from previous tweens
    Object.keys(currentStyle).forEach(function (current) {
      if (!(current in this$1$1.valuesStart)) {
        startValues[current] = currentStyle[current] || defaultValues[current];
      }
    });

    this.valuesStart = {};
    prepareObject.call(this, startValues, 'start');
  }

  var Process = {
    getInlineStyle: getInlineStyle,
    getStyleForProperty: getStyleForProperty,
    getStartValues: getStartValues,
    prepareObject: prepareObject,
  };

  var connect = {};

  var Easing = {
    linear: new CubicBezier(0, 0, 1, 1, 'linear'),
    easingSinusoidalIn: new CubicBezier(0.47, 0, 0.745, 0.715, 'easingSinusoidalIn'),
    easingSinusoidalOut: new CubicBezier(0.39, 0.575, 0.565, 1, 'easingSinusoidalOut'),
    easingSinusoidalInOut: new CubicBezier(0.445, 0.05, 0.55, 0.95, 'easingSinusoidalInOut'),

    easingQuadraticIn: new CubicBezier(0.550, 0.085, 0.680, 0.530, 'easingQuadraticIn'),
    easingQuadraticOut: new CubicBezier(0.250, 0.460, 0.450, 0.940, 'easingQuadraticOut'),
    easingQuadraticInOut: new CubicBezier(0.455, 0.030, 0.515, 0.955, 'easingQuadraticInOut'),

    easingCubicIn: new CubicBezier(0.55, 0.055, 0.675, 0.19, 'easingCubicIn'),
    easingCubicOut: new CubicBezier(0.215, 0.61, 0.355, 1, 'easingCubicOut'),
    easingCubicInOut: new CubicBezier(0.645, 0.045, 0.355, 1, 'easingCubicInOut'),

    easingQuarticIn: new CubicBezier(0.895, 0.03, 0.685, 0.22, 'easingQuarticIn'),
    easingQuarticOut: new CubicBezier(0.165, 0.84, 0.44, 1, 'easingQuarticOut'),
    easingQuarticInOut: new CubicBezier(0.77, 0, 0.175, 1, 'easingQuarticInOut'),

    easingQuinticIn: new CubicBezier(0.755, 0.05, 0.855, 0.06, 'easingQuinticIn'),
    easingQuinticOut: new CubicBezier(0.23, 1, 0.32, 1, 'easingQuinticOut'),
    easingQuinticInOut: new CubicBezier(0.86, 0, 0.07, 1, 'easingQuinticInOut'),

    easingExponentialIn: new CubicBezier(0.95, 0.05, 0.795, 0.035, 'easingExponentialIn'),
    easingExponentialOut: new CubicBezier(0.19, 1, 0.22, 1, 'easingExponentialOut'),
    easingExponentialInOut: new CubicBezier(1, 0, 0, 1, 'easingExponentialInOut'),

    easingCircularIn: new CubicBezier(0.6, 0.04, 0.98, 0.335, 'easingCircularIn'),
    easingCircularOut: new CubicBezier(0.075, 0.82, 0.165, 1, 'easingCircularOut'),
    easingCircularInOut: new CubicBezier(0.785, 0.135, 0.15, 0.86, 'easingCircularInOut'),

    easingBackIn: new CubicBezier(0.6, -0.28, 0.735, 0.045, 'easingBackIn'),
    easingBackOut: new CubicBezier(0.175, 0.885, 0.32, 1.275, 'easingBackOut'),
    easingBackInOut: new CubicBezier(0.68, -0.55, 0.265, 1.55, 'easingBackInOut'),
  };

  function processBezierEasing(fn) {
    if (typeof fn === 'function') {
      return fn;
    } if (typeof (Easing[fn]) === 'function') {
      return Easing[fn];
    } if (/bezier/.test(fn)) {
      var bz = fn.replace(/bezier|\s|\(|\)/g, '').split(',');
      return new CubicBezier(bz[0] * 1, bz[1] * 1, bz[2] * 1, bz[3] * 1); // bezier easing
    }
    // if (/elastic|bounce/i.test(fn)) {
    //   throw TypeError(`KUTE.js - CubicBezier doesn't support ${fn} easing.`);
    // }
    return Easing.linear;
  }

  connect.processEasing = processBezierEasing;

  // a public selector utility
  function selector(el, multi) {
    try {
      var requestedElem;
      var itemsArray;
      if (multi) {
        itemsArray = el instanceof Array && el.every(function (x) { return x instanceof Element; });
        requestedElem = el instanceof HTMLCollection || el instanceof NodeList || itemsArray
          ? el : document.querySelectorAll(el);
      } else {
        requestedElem = el instanceof Element || el === window // scroll
          ? el : document.querySelector(el);
      }
      return requestedElem;
    } catch (e) {
      throw TypeError(("KUTE.js - Element(s) not found: " + el + "."));
    }
  }

  function queueStart() {
    var this$1$1 = this;

    // fire onStart actions
    Object.keys(onStart).forEach(function (obj) {
      if (typeof (onStart[obj]) === 'function') {
        onStart[obj].call(this$1$1, obj); // easing functions
      } else {
        Object.keys(onStart[obj]).forEach(function (prop) {
          onStart[obj][prop].call(this$1$1, prop);
        });
      }
    });

    // add interpolations
    linkInterpolation.call(this);
  }

  // single Tween object construct
  // TweenBase is meant to be use for pre-processed values
  var TweenBase = function TweenBase(targetElement, startObject, endObject, opsObject) {
    var this$1$1 = this;

    // element animation is applied to
    this.element = targetElement;

    this.playing = false;

    this._startTime = null;
    this._startFired = false;

    this.valuesEnd = endObject; // valuesEnd
    this.valuesStart = startObject; // valuesStart

    // OPTIONS
    var options = opsObject || {};
    // internal option to process inline/computed style at start instead of init
    // used by to() method and expects object : {} / false
    this._resetStart = options.resetStart || 0;
    // you can only set a core easing function as default
    this._easing = typeof (options.easing) === 'function' ? options.easing : connect.processEasing(options.easing);
    this._duration = options.duration || defaultOptions.duration; // duration option | default
    this._delay = options.delay || defaultOptions.delay; // delay option | default

    // set other options
    Object.keys(options).forEach(function (op) {
      var internalOption = "_" + op;
      if (!(internalOption in this$1$1)) { this$1$1[internalOption] = options[op]; }
    });

    // callbacks should not be set as undefined
    // this._onStart = options.onStart
    // this._onUpdate = options.onUpdate
    // this._onStop = options.onStop
    // this._onComplete = options.onComplete

    // queue the easing
    var easingFnName = this._easing.name;
    if (!onStart[easingFnName]) {
      onStart[easingFnName] = function easingFn(prop) {
        if (!KUTE[prop] && prop === this._easing.name) { KUTE[prop] = this._easing; }
      };
    }

    return this;
  };

  // tween prototype
  // queue tween object to main frame update
  // move functions that use the ticker outside the prototype to be in the same scope with it
  TweenBase.prototype.start = function start (time) {
    // now it's a good time to start
    add(this);
    this.playing = true;

    this._startTime = typeof time !== 'undefined' ? time : KUTE.Time();
    this._startTime += this._delay;

    if (!this._startFired) {
      if (this._onStart) {
        this._onStart.call(this);
      }

      queueStart.call(this);

      this._startFired = true;
    }

    if (!Tick) { Ticker(); }
    return this;
  };

  TweenBase.prototype.stop = function stop () {
    if (this.playing) {
      remove(this);
      this.playing = false;

      if (this._onStop) {
        this._onStop.call(this);
      }
      this.close();
    }
    return this;
  };

  TweenBase.prototype.close = function close () {
      var this$1$1 = this;

    // scroll|transformMatrix need this
    Object.keys(onComplete).forEach(function (component) {
      Object.keys(onComplete[component]).forEach(function (toClose) {
        onComplete[component][toClose].call(this$1$1, toClose);
      });
    });
    // when all animations are finished, stop ticking after ~3 frames
    this._startFired = false;
    stop.call(this);
  };

  TweenBase.prototype.chain = function chain (args) {
    this._chain = [];
    this._chain = args.length ? args : this._chain.concat(args);
    return this;
  };

  TweenBase.prototype.stopChainedTweens = function stopChainedTweens () {
    if (this._chain && this._chain.length) { this._chain.forEach(function (tw) { return tw.stop(); }); }
  };

  TweenBase.prototype.update = function update (time) {
      var this$1$1 = this;

    var T = time !== undefined ? time : KUTE.Time();

    var elapsed;

    if (T < this._startTime && this.playing) { return true; }

    elapsed = (T - this._startTime) / this._duration;
    elapsed = (this._duration === 0 || elapsed > 1) ? 1 : elapsed;

    // calculate progress
    var progress = this._easing(elapsed);

    // render the update
    Object.keys(this.valuesEnd).forEach(function (tweenProp) {
      KUTE[tweenProp](this$1$1.element,
        this$1$1.valuesStart[tweenProp],
        this$1$1.valuesEnd[tweenProp],
        progress);
    });

    // fire the updateCallback
    if (this._onUpdate) {
      this._onUpdate.call(this);
    }

    if (elapsed === 1) {
      // fire the complete callback
      if (this._onComplete) {
        this._onComplete.call(this);
      }

      // now we're sure no animation is running
      this.playing = false;

      // stop ticking when finished
      this.close();

      // start animating chained tweens
      if (this._chain !== undefined && this._chain.length) {
        this._chain.map(function (tw) { return tw.start(); });
      }

      return false;
    }

    return true;
  };

  // Update Tween Interface
  connect.tween = TweenBase;

  defaultOptions.repeat = 0;
  defaultOptions.repeatDelay = 0;
  defaultOptions.yoyo = false;
  defaultOptions.resetStart = false;

  // no need to set defaults for callbacks
  // defaultOptions.onPause = undefined
  // defaultOptions.onResume = undefined

  // the constructor that supports to, allTo methods
  var Tween = /*@__PURE__*/(function (TweenBase) {
    function Tween() {
      var this$1$1 = this;
      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      TweenBase.apply(this, args); // this calls the constructor of TweenBase

      // reset interpolation values
      this.valuesStart = {};
      this.valuesEnd = {};

      var startObject = args[1];
      var endObject = args[2];

      // set valuesEnd
      prepareObject.call(this, endObject, 'end');

      // set valuesStart
      if (this._resetStart) {
        this.valuesStart = startObject;
      } else {
        prepareObject.call(this, startObject, 'start');
      }

      // ready for crossCheck
      if (!this._resetStart) {
        Object.keys(crossCheck).forEach(function (component) {
          Object.keys(crossCheck[component]).forEach(function (checkProp) {
            crossCheck[component][checkProp].call(this$1$1, checkProp);
          });
        });
      }

      // set paused state
      this.paused = false;
      this._pauseTime = null;

      // additional properties and options
      var options = args[3];

      this._repeat = options.repeat || defaultOptions.repeat;
      this._repeatDelay = options.repeatDelay || defaultOptions.repeatDelay;
      // we cache the number of repeats to be able to put it back after all cycles finish
      this._repeatOption = this._repeat;

      // yoyo needs at least repeat: 1
      this.valuesRepeat = {}; // valuesRepeat
      this._yoyo = options.yoyo || defaultOptions.yoyo;
      this._reversed = false;

      // don't load extra callbacks
      // this._onPause = options.onPause || defaultOptions.onPause
      // this._onResume = options.onResume || defaultOptions.onResume

      // chained Tweens
      // this._chain = options.chain || defaultOptions.chain;
      return this;
    }

    if ( TweenBase ) Tween.__proto__ = TweenBase;
    Tween.prototype = Object.create( TweenBase && TweenBase.prototype );
    Tween.prototype.constructor = Tween;

    // additions to start method
    Tween.prototype.start = function start (time) {
      var this$1$1 = this;

      // on start we reprocess the valuesStart for TO() method
      if (this._resetStart) {
        this.valuesStart = this._resetStart;
        getStartValues.call(this);

        // this is where we do the valuesStart and valuesEnd check for fromTo() method
        Object.keys(crossCheck).forEach(function (component) {
          Object.keys(crossCheck[component]).forEach(function (checkProp) {
            crossCheck[component][checkProp].call(this$1$1, checkProp);
          });
        });
      }
      // still not paused
      this.paused = false;

      // set yoyo values
      if (this._yoyo) {
        Object.keys(this.valuesEnd).forEach(function (endProp) {
          this$1$1.valuesRepeat[endProp] = this$1$1.valuesStart[endProp];
        });
      }

      TweenBase.prototype.start.call(this, time);

      return this;
    };

    // updates to super methods
    Tween.prototype.stop = function stop () {
      TweenBase.prototype.stop.call(this);
      if (!this.paused && this.playing) {
        this.paused = false;
        this.stopChainedTweens();
      }
      return this;
    };

    Tween.prototype.close = function close () {
      TweenBase.prototype.close.call(this);

      if (this._repeatOption > 0) {
        this._repeat = this._repeatOption;
      }
      if (this._yoyo && this._reversed === true) {
        this.reverse();
        this._reversed = false;
      }

      return this;
    };

    // additions to prototype
    Tween.prototype.resume = function resume () {
      if (this.paused && this.playing) {
        this.paused = false;
        if (this._onResume !== undefined) {
          this._onResume.call(this);
        }
        // re-queue execution context
        queueStart.call(this);
        // update time and let it roll
        this._startTime += KUTE.Time() - this._pauseTime;
        add(this);
        // restart ticker if stopped
        if (!Tick) { Ticker(); }
      }
      return this;
    };

    Tween.prototype.pause = function pause () {
      if (!this.paused && this.playing) {
        remove(this);
        this.paused = true;
        this._pauseTime = KUTE.Time();
        if (this._onPause !== undefined) {
          this._onPause.call(this);
        }
      }
      return this;
    };

    Tween.prototype.reverse = function reverse () {
      var this$1$1 = this;

      // if (this._yoyo) {
      Object.keys(this.valuesEnd).forEach(function (reverseProp) {
        var tmp = this$1$1.valuesRepeat[reverseProp];
        this$1$1.valuesRepeat[reverseProp] = this$1$1.valuesEnd[reverseProp];
        this$1$1.valuesEnd[reverseProp] = tmp;
        this$1$1.valuesStart[reverseProp] = this$1$1.valuesRepeat[reverseProp];
      });
      // }
    };

    Tween.prototype.update = function update (time) {
      var this$1$1 = this;

      var T = time !== undefined ? time : KUTE.Time();

      var elapsed;

      if (T < this._startTime && this.playing) { return true; }

      elapsed = (T - this._startTime) / this._duration;
      elapsed = (this._duration === 0 || elapsed > 1) ? 1 : elapsed;

      // calculate progress
      var progress = this._easing(elapsed);

      // render the update
      Object.keys(this.valuesEnd).forEach(function (tweenProp) {
        KUTE[tweenProp](this$1$1.element,
          this$1$1.valuesStart[tweenProp],
          this$1$1.valuesEnd[tweenProp],
          progress);
      });

      // fire the updateCallback
      if (this._onUpdate) {
        this._onUpdate.call(this);
      }

      if (elapsed === 1) {
        if (this._repeat > 0) {
          if (Number.isFinite(this._repeat)) { this._repeat -= 1; }

          // set the right time for delay
          this._startTime = T;
          if (Number.isFinite(this._repeat) && this._yoyo && !this._reversed) {
            this._startTime += this._repeatDelay;
          }

          if (this._yoyo) { // handle yoyo
            this._reversed = !this._reversed;
            this.reverse();
          }

          return true;
        }

        // fire the complete callback
        if (this._onComplete) {
          this._onComplete.call(this);
        }

        // now we're sure no animation is running
        this.playing = false;

        // stop ticking when finished
        this.close();

        // start animating chained tweens
        if (this._chain !== undefined && this._chain.length) {
          this._chain.forEach(function (tw) { return tw.start(); });
        }

        return false;
      }
      return true;
    };

    return Tween;
  }(TweenBase));

  // Update Tween Interface Update
  connect.tween = Tween;

  // to do
  // * per property easing
  // * per property duration
  // * per property callback
  // * per property delay/offset
  // * new update method to work with the above
  // * other cool ideas

  var TweenExtra = /*@__PURE__*/(function (Tween) {
    function TweenExtra() {
      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      Tween.apply(this, args); // import constructor of TweenBase -> Tween

      return this;
    }

    if ( Tween ) TweenExtra.__proto__ = Tween;
    TweenExtra.prototype = Object.create( Tween && Tween.prototype );
    TweenExtra.prototype.constructor = TweenExtra;

    // additional methods
    // set/override property
    // to(property, value) {
    // TO DO
    // this.valuesEnd[property] = value // well that's not all
    // }

    // fromTo(property, value) {
    // TO DO
    // this.valuesEnd[property] = value // well that's not all
    // }

    // getTotalDuration() {
    // to do
    // }

    // set callbacks
    TweenExtra.prototype.on = function on (name, fn) {
      if (['start', 'stop', 'update', 'complete', 'pause', 'resume'].indexOf(name) > -1) {
        this[("_on" + (name.charAt(0).toUpperCase() + name.slice(1)))] = fn;
      }
    };

    // set options accepting [repeat,yoyo,delay,repeatDelay,easing]
    TweenExtra.prototype.option = function option (o, v) {
      this[("_" + o)] = v;
    };

    return TweenExtra;
  }(Tween));

  // Tween Interface
  connect.tween = TweenExtra;

  // KUTE.js Tween Collection
  // ========================

  var TweenCollection = function TweenCollection(els, vS, vE, Options) {
    var this$1$1 = this;

    this.tweens = [];

    // set default offset
    if (!('offset' in defaultOptions)) { defaultOptions.offset = 0; }

    var Ops = Options || {};
    Ops.delay = Ops.delay || defaultOptions.delay;

    // set all options
    var options = [];

    Array.from(els).forEach(function (el, i) {
      var TweenConstructor = connect.tween;
      options[i] = Ops || {};
      options[i].delay = i > 0 ? Ops.delay + (Ops.offset || defaultOptions.offset) : Ops.delay;
      if (el instanceof Element) {
        this$1$1.tweens.push(new TweenConstructor(el, vS, vE, options[i]));
      } else {
        throw Error(("KUTE.js - " + el + " not instanceof [Element]"));
      }
    });

    this.length = this.tweens.length;
    return this;
  };

  TweenCollection.prototype.start = function start (time) {
    var T = time === undefined ? KUTE.Time() : time;
    this.tweens.map(function (tween) { return tween.start(T); });
    return this;
  };

  TweenCollection.prototype.stop = function stop () {
    this.tweens.map(function (tween) { return tween.stop(); });
    return this;
  };

  TweenCollection.prototype.pause = function pause (time) {
    var T = time === undefined ? KUTE.Time() : time;
    this.tweens.map(function (tween) { return tween.pause(T); });
    return this;
  };

  TweenCollection.prototype.resume = function resume (time) {
    var T = time === undefined ? KUTE.Time() : time;
    this.tweens.map(function (tween) { return tween.resume(T); });
    return this;
  };

  TweenCollection.prototype.chain = function chain (args) {
    var lastTween = this.tweens[this.length - 1];
    if (args instanceof TweenCollection) {
      lastTween.chain(args.tweens);
    } else if (args instanceof connect.tween) {
      lastTween.chain(args);
    } else {
      throw new TypeError('KUTE.js - invalid chain value');
    }
    return this;
  };

  TweenCollection.prototype.playing = function playing () {
    return this.tweens.some(function (tw) { return tw.playing; });
  };

  TweenCollection.prototype.removeTweens = function removeTweens () {
    this.tweens = [];
  };

  TweenCollection.prototype.getMaxDuration = function getMaxDuration () {
    var durations = [];
    this.tweens.forEach(function (tw) {
      durations.push(tw._duration + tw._delay + tw._repeat * tw._repeatDelay);
    });
    return Math.max(durations);
  };

  var ProgressBar = function ProgressBar(element, tween) {
    var assign;

    this.element = selector(element);
    this.element.tween = tween;
    this.element.tween.toolbar = this.element;
    this.element.toolbar = this;
    (assign = this.element.parentNode.getElementsByTagName('OUTPUT'), this.element.output = assign[0]);

    // invalidate
    if (!(this.element instanceof HTMLInputElement)) { throw TypeError('Target element is not [HTMLInputElement]'); }
    if (this.element.type !== 'range') { throw TypeError('Target element is not a range input'); }
    if (!(tween instanceof connect.tween)) { throw TypeError(("tween parameter is not [" + (connect.tween) + "]")); }

    this.element.setAttribute('value', 0);
    this.element.setAttribute('min', 0);
    this.element.setAttribute('max', 1);
    this.element.setAttribute('step', 0.0001);

    this.element.tween._onUpdate = this.updateBar;

    this.element.addEventListener('mousedown', this.downAction, false);
  };

  ProgressBar.prototype.updateBar = function updateBar () {
    var tick = 0.0001;
    var ref = this.toolbar;
      var output = ref.output;

    // let progress = this.paused ? this.toolbar.value
    // : (KUTE.Time() - this._startTime) / this._duration;
    // progress = progress > 1 - tick ? 1 : progress < 0.01 ? 0 : progress;

    var progress;
    if (this.paused) {
      progress = this.toolbar.value;
    } else {
      progress = (KUTE.Time() - this._startTime) / this._duration;
    }

    // progress = progress > 1 - tick ? 1 : progress < 0.01 ? 0 : progress;
    if (progress > 1 - tick) { progress = 1; }
    if (progress < 0.01) { progress = 0; }

    var value = !this._reversed ? progress : 1 - progress;
    this.toolbar.value = value;
    if (output) { output.value = ((value * 10000 >> 0) / 100) + "%"; }
  };

  ProgressBar.prototype.toggleEvents = function toggleEvents (action) {
    // add passive handler ?
    this.element[(action + "EventListener")]('mousemove', this.moveAction, false);
    this.element[(action + "EventListener")]('mouseup', this.upAction, false);
  };

  ProgressBar.prototype.updateTween = function updateTween () {
    // make sure we never complete the tween
    var progress = (!this.tween._reversed ? this.value : 1 - this.value)
      * this.tween._duration - 0.0001;

    this.tween._startTime = 0;
    this.tween.update(progress);
  };

  ProgressBar.prototype.moveAction = function moveAction () {
    this.toolbar.updateTween.call(this);
  };

  ProgressBar.prototype.downAction = function downAction () {
    if (!this.tween.playing) {
      this.tween.start();
    }

    if (!this.tween.paused) {
      this.tween.pause();
      this.toolbar.toggleEvents('add');

      KUTE.Tick = cancelAnimationFrame(KUTE.Ticker);
    }
  };

  ProgressBar.prototype.upAction = function upAction () {
    if (this.tween.paused) {
      if (this.tween.paused) { this.tween.resume(); }

      this.tween._startTime = KUTE.Time()
        - (!this.tween._reversed ? this.value : 1 - this.value) * this.tween._duration;

      this.toolbar.toggleEvents('remove');
      KUTE.Tick = requestAnimationFrame(KUTE.Ticker);
    }
  };

  function to(element, endObject, optionsObj) {
    var options = optionsObj || {};
    var TweenConstructor = connect.tween;
    options.resetStart = endObject;
    return new TweenConstructor(selector(element), endObject, endObject, options);
  }

  function fromTo(element, startObject, endObject, optionsObj) {
    var options = optionsObj || {};
    var TweenConstructor = connect.tween;
    return new TweenConstructor(selector(element), startObject, endObject, options);
  }

  // multiple elements tween objects
  function allTo(elements, endObject, optionsObj) {
    var options = optionsObj || {};
    optionsObj.resetStart = endObject;
    return new TweenCollection(selector(elements, true), endObject, endObject, options);
  }

  function allFromTo(elements, startObject, endObject, optionsObj) {
    var options = optionsObj || {};
    return new TweenCollection(selector(elements, true), startObject, endObject, options);
  }

  // Animation class
  // * builds KUTE components
  // * populate KUTE objects
  // * AnimatonBase creates a KUTE.js build for pre-made Tween objects
  // * AnimatonDevelopment can help you debug your new components
  var Animation = function Animation(Component) {
    try {
      if (Component.component in supportedProperties) {
        throw Error(("KUTE.js - " + (Component.component) + " already registered"));
      } else if (Component.property in defaultValues) {
        throw Error(("KUTE.js - " + (Component.property) + " already registered"));
      } else {
        this.setComponent(Component);
      }
    } catch (e) {
      throw Error(e);
    }
  };

  Animation.prototype.setComponent = function setComponent (Component) {
    var propertyInfo = this;
    var ComponentName = Component.component;
    // const Objects = { defaultValues, defaultOptions, Interpolate, linkProperty, Util }
    var Functions = {
      prepareProperty: prepareProperty, prepareStart: prepareStart, onStart: onStart, onComplete: onComplete, crossCheck: crossCheck,
    };
    var Category = Component.category;
    var Property = Component.property;
    var Length = (Component.properties && Component.properties.length)
      || (Component.subProperties && Component.subProperties.length);

    // single property
    // {property,defaultvalue,defaultOptions,Interpolate,functions}

    // category colors, boxModel, borderRadius
    // {category,properties,defaultvalues,defaultOptions,Interpolate,functions}

    // property with multiple sub properties. Eg transform, filter
    // {property,subProperties,defaultvalues,defaultOptions,Interpolate,functions}

    // property with multiple sub properties. Eg htmlAttributes
    // {category,subProperties,defaultvalues,defaultOptions,Interpolate,functions}

    // set supported category/property
    supportedProperties[ComponentName] = Component.properties
      || Component.subProperties || Component.property;

    // set defaultValues
    if ('defaultValue' in Component) { // value 0 will invalidate
      defaultValues[Property] = Component.defaultValue;

      // minimal info
      propertyInfo.supports = Property + " property";
    } else if (Component.defaultValues) {
      Object.keys(Component.defaultValues).forEach(function (dv) {
        defaultValues[dv] = Component.defaultValues[dv];
      });

      // minimal info
      propertyInfo.supports = (Length || Property) + " " + (Property || Category) + " properties";
    }

    // set additional options
    if (Component.defaultOptions) {
      Object.keys(Component.defaultOptions).forEach(function (op) {
        defaultOptions[op] = Component.defaultOptions[op];
      });
    }

    // set functions
    if (Component.functions) {
      Object.keys(Functions).forEach(function (fn) {
        if (fn in Component.functions) {
          if (typeof (Component.functions[fn]) === 'function') {
            // if (!Functions[fn][ Category||Property ]) {
            // Functions[fn][ Category||Property ] = Component.functions[fn];
            // }
            if (!Functions[fn][ComponentName]) { Functions[fn][ComponentName] = {}; }
            if (!Functions[fn][ComponentName][Category || Property]) {
              Functions[fn][ComponentName][Category || Property] = Component.functions[fn];
            }
          } else {
            Object.keys(Component.functions[fn]).forEach(function (ofn) {
              // !Functions[fn][ofn] && (Functions[fn][ofn] = Component.functions[fn][ofn])
              if (!Functions[fn][ComponentName]) { Functions[fn][ComponentName] = {}; }
              if (!Functions[fn][ComponentName][ofn]) {
                Functions[fn][ComponentName][ofn] = Component.functions[fn][ofn];
              }
            });
          }
        }
      });
    }

    // set component interpolate
    if (Component.Interpolate) {
      Object.keys(Component.Interpolate).forEach(function (fni) {
        var compIntObj = Component.Interpolate[fni];
        if (typeof (compIntObj) === 'function' && !Interpolate[fni]) {
          Interpolate[fni] = compIntObj;
        } else {
          Object.keys(compIntObj).forEach(function (sfn) {
            if (typeof (compIntObj[sfn]) === 'function' && !Interpolate[fni]) {
              Interpolate[fni] = compIntObj[sfn];
            }
          });
        }
      });

      linkProperty[ComponentName] = Component.Interpolate;
    }

    // set component util
    if (Component.Util) {
      Object.keys(Component.Util).forEach(function (fnu) {
        if (!Util[fnu]) { Util[fnu] = Component.Util[fnu]; }
      });
    }

    return propertyInfo;
  };

  // AnimationDevelopment class
  var AnimationDevelopment = /*@__PURE__*/(function (Animation) {
    function AnimationDevelopment() {
      var ref;

      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];
      Animation.apply(this, args);

      (ref = this).setComponent.apply(ref, args);
    }

    if ( Animation ) AnimationDevelopment.__proto__ = Animation;
    AnimationDevelopment.prototype = Object.create( Animation && Animation.prototype );
    AnimationDevelopment.prototype.constructor = AnimationDevelopment;

    AnimationDevelopment.prototype.setComponent = function setComponent (Component) {
      Animation.prototype.setComponent.call(this, Component);

      var propertyInfo = this;
      // const Objects = { defaultValues, defaultOptions, Interpolate, linkProperty, Util }
      var Functions = {
        prepareProperty: prepareProperty, prepareStart: prepareStart, onStart: onStart, onComplete: onComplete, crossCheck: crossCheck,
      };
      var Category = Component.category;
      var Property = Component.property;
      var Length = (Component.properties && Component.properties.length)
        || (Component.subProperties && Component.subProperties.length);

      // set defaultValues
      if ('defaultValue' in Component) { // value 0 will invalidate
        propertyInfo.supports = Property + " property";
        propertyInfo.defaultValue = "" + ((("" + (Component.defaultValue))).length ? 'YES' : 'not set or incorrect');
      } else if (Component.defaultValues) {
        propertyInfo.supports = (Length || Property) + " " + (Property || Category) + " properties";
        propertyInfo.defaultValues = Object.keys(Component.defaultValues).length === Length ? 'YES' : 'Not set or incomplete';
      }

      // set additional options
      if (Component.defaultOptions) {
        propertyInfo.extends = [];

        Object.keys(Component.defaultOptions).forEach(function (op) {
          propertyInfo.extends.push(op);
        });

        if (propertyInfo.extends.length) {
          propertyInfo.extends = "with <" + (propertyInfo.extends.join(', ')) + "> new option(s)";
        } else {
          delete propertyInfo.extends;
        }
      }

      // set functions
      if (Component.functions) {
        propertyInfo.interface = [];
        propertyInfo.render = [];
        propertyInfo.warning = [];

        Object.keys(Functions).forEach(function (fnf) {
          if (fnf in Component.functions) {
            if (fnf === 'prepareProperty') { propertyInfo.interface.push('fromTo()'); }
            if (fnf === 'prepareStart') { propertyInfo.interface.push('to()'); }
            if (fnf === 'onStart') { propertyInfo.render = 'can render update'; }
          } else {
            if (fnf === 'prepareProperty') { propertyInfo.warning.push('fromTo()'); }
            if (fnf === 'prepareStart') { propertyInfo.warning.push('to()'); }
            if (fnf === 'onStart') { propertyInfo.render = 'no function to render update'; }
          }
        });

        if (propertyInfo.interface.length) {
          propertyInfo.interface = (Category || Property) + " can use [" + (propertyInfo.interface.join(', ')) + "] method(s)";
        } else {
          delete propertyInfo.uses;
        }

        if (propertyInfo.warning.length) {
          propertyInfo.warning = (Category || Property) + " can't use [" + (propertyInfo.warning.join(', ')) + "] method(s) because values aren't processed";
        } else {
          delete propertyInfo.warning;
        }
      }

      // register Interpolation functions
      if (Component.Interpolate) {
        propertyInfo.uses = [];
        propertyInfo.adds = [];

        Object.keys(Component.Interpolate).forEach(function (fni) {
          var compIntObj = Component.Interpolate[fni];
          // register new Interpolation functions
          if (typeof (compIntObj) === 'function') {
            if (!Interpolate[fni]) {
              propertyInfo.adds.push(("" + fni));
            }
            propertyInfo.uses.push(("" + fni));
          } else {
            Object.keys(compIntObj).forEach(function (sfn) {
              if (typeof (compIntObj[sfn]) === 'function' && !Interpolate[fni]) {
                propertyInfo.adds.push(("" + sfn));
              }
              propertyInfo.uses.push(("" + sfn));
            });
          }
        });

        if (propertyInfo.uses.length) {
          propertyInfo.uses = "[" + (propertyInfo.uses.join(', ')) + "] interpolation function(s)";
        } else {
          delete propertyInfo.uses;
        }

        if (propertyInfo.adds.length) {
          propertyInfo.adds = "new [" + (propertyInfo.adds.join(', ')) + "] interpolation function(s)";
        } else {
          delete propertyInfo.adds;
        }
      } else {
        propertyInfo.critical = "For " + (Property || Category) + " no interpolation function[s] is set";
      }

      // set component util
      if (Component.Util) {
        propertyInfo.hasUtil = Object.keys(Component.Util).join(',');
      }

      return propertyInfo;
    };

    return AnimationDevelopment;
  }(Animation));

  function numbers(a, b, v) { // number1, number2, progress
    var A = +a;
    var B = b - a;
    // a = +a; b -= a;
    return A + B * v;
  }

  // trueDimension - returns { v = value, u = unit }
  function trueDimension(dimValue, isAngle) {
    var intValue = parseInt(dimValue, 10) || 0;
    var mUnits = ['px', '%', 'deg', 'rad', 'em', 'rem', 'vh', 'vw'];
    var theUnit;

    for (var mIndex = 0; mIndex < mUnits.length; mIndex += 1) {
      if (typeof dimValue === 'string' && dimValue.includes(mUnits[mIndex])) {
        theUnit = mUnits[mIndex]; break;
      }
    }
    if (theUnit === undefined) {
      theUnit = isAngle ? 'deg' : 'px';
    }

    return { v: intValue, u: theUnit };
  }

  /* bgPosProp = {
    property: 'backgroundPosition',
    defaultValue: [0,0],
    interpolators: {numbers},
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Functions
  function onStartBgPos(prop) {
    if (this.valuesEnd[prop] && !KUTE[prop]) {
      KUTE[prop] = function (elem, a, b, v) {
        elem.style[prop] = ((numbers(a[0], b[0], v) * 100 >> 0) / 100) + "%  " + (((numbers(a[1], b[1], v) * 100 >> 0) / 100)) + "%";
      };
    }
  }

  /* bgPosProp = {
    property: 'backgroundPosition',
    defaultValue: [0,0],
    interpolators: {numbers},
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Functions
  function getBgPos(prop/* , value */) {
    return getStyleForProperty(this.element, prop) || defaultValues[prop];
  }

  function prepareBgPos(prop, value) {
    if (value instanceof Array) {
      var x = trueDimension(value[0]).v;
      var y = trueDimension(value[1]).v;
      return [!Number.isNaN(x * 1) ? x : 50, !Number.isNaN(y * 1) ? y : 50];
    }

    var posxy = value.replace(/top|left/g, 0)
      .replace(/right|bottom/g, 100)
      .replace(/center|middle/g, 50);

    posxy = posxy.split(/(,|\s)/g);
    posxy = posxy.length === 2 ? posxy : [posxy[0], 50];
    return [trueDimension(posxy[0]).v, trueDimension(posxy[1]).v];
  }

  // All Component Functions
  var bgPositionFunctions = {
    prepareStart: getBgPos,
    prepareProperty: prepareBgPos,
    onStart: onStartBgPos,
  };

  // Component Full Object
  var BackgroundPosition = {
    component: 'backgroundPositionProp',
    property: 'backgroundPosition',
    defaultValue: [50, 50],
    Interpolate: { numbers: numbers },
    functions: bgPositionFunctions,
    Util: { trueDimension: trueDimension },
  };

  function units(a, b, u, v) { // number1, number2, unit, progress
    var A = +a;
    var B = b - a;
    // a = +a; b -= a;
    return (A + B * v) + u;
  }

  /* borderRadius = {
    category: 'borderRadius',
    properties : [..],
    defaultValues: {..},
    interpolation: {units}
  } */

  // Component Properties
  var radiusProps$1 = ['borderRadius',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];

  // Component Functions
  function radiusOnStartFn(tweenProp) {
    if (tweenProp in this.valuesEnd && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.style[tweenProp] = units(a.v, b.v, b.u, v);
      };
    }
  }
  var radiusOnStart$1 = {};
  radiusProps$1.forEach(function (tweenProp) {
    radiusOnStart$1[tweenProp] = radiusOnStartFn;
  });

  /* borderRadius = {
    category: 'borderRadius',
    properties : [..],
    defaultValues: {..},
    interpolation: {units}
  } */

  // Component Properties
  var radiusProps = ['borderRadius',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];

  var radiusValues = {};
  radiusProps.forEach(function (x) { radiusValues[x] = 0; });

  // Component Functions
  var radiusOnStart = {};
  radiusProps.forEach(function (tweenProp) {
    radiusOnStart[tweenProp] = radiusOnStartFn;
  });

  function getRadius(tweenProp) {
    return getStyleForProperty(this.element, tweenProp) || defaultValues[tweenProp];
  }

  function prepareRadius(tweenProp, value) {
    return trueDimension(value);
  }

  // All Component Functions
  var radiusFunctions = {
    prepareStart: getRadius,
    prepareProperty: prepareRadius,
    onStart: radiusOnStart,
  };

  // Full Component
  var BorderRadius = {
    component: 'borderRadiusProperties',
    category: 'borderRadius',
    properties: radiusProps,
    defaultValues: radiusValues,
    Interpolate: { units: units },
    functions: radiusFunctions,
    Util: { trueDimension: trueDimension },
  };

  // Component Functions
  function boxModelOnStart(tweenProp) {
    if (tweenProp in this.valuesEnd && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.style[tweenProp] = (v > 0.99 || v < 0.01
          ? ((numbers(a, b, v) * 10) >> 0) / 10
          : (numbers(a, b, v)) >> 0) + "px";
      };
    }
  }

  // Component Base Props
  var baseBoxProps = ['top', 'left', 'width', 'height'];
  var baseBoxOnStart = {};
  baseBoxProps.forEach(function (x) { baseBoxOnStart[x] = boxModelOnStart; });

  // Component Properties
  var boxModelProperties = ['top', 'left', 'width', 'height', 'right', 'bottom', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'outlineWidth'];

  var boxModelValues = {};
  boxModelProperties.forEach(function (x) { boxModelValues[x] = 0; });

  // Component Functions
  function getBoxModel(tweenProp) {
    return getStyleForProperty(this.element, tweenProp) || defaultValues[tweenProp];
  }
  function prepareBoxModel(tweenProp, value) {
    var boxValue = trueDimension(value); var
      offsetProp = tweenProp === 'height' ? 'offsetHeight' : 'offsetWidth';
    return boxValue.u === '%' ? (boxValue.v * this.element[offsetProp]) / 100 : boxValue.v;
  }
  var boxPropsOnStart = {};
  boxModelProperties.forEach(function (x) { boxPropsOnStart[x] = boxModelOnStart; });

  // All Component Functions
  var boxModelFunctions = {
    prepareStart: getBoxModel,
    prepareProperty: prepareBoxModel,
    onStart: boxPropsOnStart,
  };

  // Component Full Component
  var boxModel = {
    component: 'boxModelProperties',
    category: 'boxModel',
    properties: boxModelProperties,
    defaultValues: boxModelValues,
    Interpolate: { numbers: numbers },
    functions: boxModelFunctions,
  };

  // Component Functions
  function onStartClip(tweenProp) {
    if (this.valuesEnd[tweenProp] && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        var h = 0; var
          cl = [];
        for (h; h < 4; h += 1) {
          var c1 = a[h].v; var c2 = b[h].v; var
            cu = b[h].u || 'px';
          cl[h] = ((numbers(c1, c2, v) * 100 >> 0) / 100) + cu;
        }
        elem.style.clip = "rect(" + cl + ")";
      };
    }
  }

  // Component Functions
  function getClip(tweenProp/* , value */) {
    var currentClip = getStyleForProperty(this.element, tweenProp);
    var width = getStyleForProperty(this.element, 'width');
    var height = getStyleForProperty(this.element, 'height');
    return !/rect/.test(currentClip) ? [0, width, height, 0] : currentClip;
  }
  function prepareClip(tweenProp, value) {
    if (value instanceof Array) {
      return value.map(function (x) { return trueDimension(x); });
    }
    var clipValue = value.replace(/rect|\(|\)/g, '');
    clipValue = /,/g.test(clipValue) ? clipValue.split(',') : clipValue.split(/\s/);
    return clipValue.map(function (x) { return trueDimension(x); });
  }

  // All Component Functions
  var clipFunctions = {
    prepareStart: getClip,
    prepareProperty: prepareClip,
    onStart: onStartClip,
  };

  // Component Full
  var clipProperty = {
    component: 'clipProperty',
    property: 'clip',
    defaultValue: [0, 0, 0, 0],
    Interpolate: { numbers: numbers },
    functions: clipFunctions,
    Util: { trueDimension: trueDimension },
  };

  // hexToRGB - returns RGB color object {r,g,b}
  function hexToRGB (hex) {
    var hexShorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i; // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var HEX = hex.replace(hexShorthand, function (m, r, g, b) { return r + r + g + g + b + b; });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(HEX);

    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  // trueColor - replace transparent and transform any color to rgba()/rgb()
  function trueColor(colorString) {
    var result;
    if (/rgb|rgba/.test(colorString)) { // first check if it's a rgb string
      var vrgb = colorString.replace(/\s|\)/, '').split('(')[1].split(',');
      var colorAlpha = vrgb[3] ? vrgb[3] : null;
      if (!colorAlpha) {
        result = { r: parseInt(vrgb[0], 10), g: parseInt(vrgb[1], 10), b: parseInt(vrgb[2], 10) };
      }
      result = {
        r: parseInt(vrgb[0], 10),
        g: parseInt(vrgb[1], 10),
        b: parseInt(vrgb[2], 10),
        a: parseFloat(colorAlpha),
      };
    } if (/^#/.test(colorString)) {
      var fromHex = hexToRGB(colorString);
      result = { r: fromHex.r, g: fromHex.g, b: fromHex.b };
    } if (/transparent|none|initial|inherit/.test(colorString)) {
      result = {
        r: 0, g: 0, b: 0, a: 0,
      };
    }
    if (!/^#|^rgb/.test(colorString)) { // maybe we can check for web safe colors
      var siteHead = document.getElementsByTagName('head')[0];
      siteHead.style.color = colorString;
      var webColor = getComputedStyle(siteHead, null).color;
      webColor = /rgb/.test(webColor) ? webColor.replace(/[^\d,]/g, '').split(',') : [0, 0, 0];
      siteHead.style.color = '';
      result = {
        r: parseInt(webColor[0], 10),
        g: parseInt(webColor[1], 10),
        b: parseInt(webColor[2], 10),
      };
    }
    return result;
  }

  function colors(a, b, v) {
    var _c = {};
    var ep = ')';
    var cm = ',';
    var rgb = 'rgb(';
    var rgba = 'rgba(';

    Object.keys(b).forEach(function (c) {
      // _c[c] = c !== 'a' ? (numbers(a[c], b[c], v) >> 0 || 0) : (a[c] && b[c])
      // ? (numbers(a[c], b[c], v) * 100 >> 0) / 100 : null;
      if (c !== 'a') {
        _c[c] = numbers(a[c], b[c], v) >> 0 || 0;
      } else if (a[c] && b[c]) {
        _c[c] = (numbers(a[c], b[c], v) * 100 >> 0) / 100;
      }
    });

    return !_c.a
      ? rgb + _c.r + cm + _c.g + cm + _c.b + ep
      : rgba + _c.r + cm + _c.g + cm + _c.b + cm + _c.a + ep;
  }

  // Component Interpolation
  // rgba1, rgba2, progress

  // Component Properties
  // supported formats
  // 'hex', 'rgb', 'rgba' '#fff' 'rgb(0,0,0)' / 'rgba(0,0,0,0)' 'red' (IE9+)
  var supportedColors$1 = ['color', 'backgroundColor', 'borderColor',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];

  // Component Functions
  function onStartColors(tweenProp) {
    if (this.valuesEnd[tweenProp] && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.style[tweenProp] = colors(a, b, v);
      };
    }
  }

  var colorsOnStart$1 = {};
  supportedColors$1.forEach(function (x) { colorsOnStart$1[x] = onStartColors; });

  // Component Interpolation
  // Component Properties
  // supported formats
  // 'hex', 'rgb', 'rgba' '#fff' 'rgb(0,0,0)' / 'rgba(0,0,0,0)' 'red' (IE9+)
  var supportedColors = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];

  var defaultColors = {};
  supportedColors.forEach(function (tweenProp) {
    defaultColors[tweenProp] = '#000';
  });

  // Component Functions
  var colorsOnStart = {};
  supportedColors.forEach(function (x) {
    colorsOnStart[x] = onStartColors;
  });

  function getColor(prop/* , value */) {
    return getStyleForProperty(this.element, prop) || defaultValues[prop];
  }
  function prepareColor(prop, value) {
    return trueColor(value);
  }

  // All Component Functions
  var colorFunctions = {
    prepareStart: getColor,
    prepareProperty: prepareColor,
    onStart: colorsOnStart,
  };

  // Component Full
  var colorProperties = {
    component: 'colorProperties',
    category: 'colors',
    properties: supportedColors,
    defaultValues: defaultColors,
    Interpolate: { numbers: numbers, colors: colors },
    functions: colorFunctions,
    Util: { trueColor: trueColor },
  };

  /* filterEffects = {
    property: 'filter',
    subProperties: {},
    defaultValue: {},
    interpolators: {},
    functions = { prepareStart, prepareProperty, onStart, crossCheck }
  } */

  // Component Interpolation
  function dropShadow(a, b, v) {
    var params = [];
    var unit = 'px';

    for (var i = 0; i < 3; i += 1) {
      params[i] = ((numbers(a[i], b[i], v) * 100 >> 0) / 100) + unit;
    }
    return ("drop-shadow(" + (params.concat(colors(a[3], b[3], v)).join(' ')) + ")");
  }
  // Component Functions
  function onStartFilter(tweenProp) {
    if (this.valuesEnd[tweenProp] && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.style[tweenProp] = (b.url ? ("url(" + (b.url) + ")") : '')
                              + (a.opacity || b.opacity ? ("opacity(" + (((numbers(a.opacity, b.opacity, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.blur || b.blur ? ("blur(" + (((numbers(a.blur, b.blur, v) * 100) >> 0) / 100) + "em)") : '')
                              + (a.saturate || b.saturate ? ("saturate(" + (((numbers(a.saturate, b.saturate, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.invert || b.invert ? ("invert(" + (((numbers(a.invert, b.invert, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.grayscale || b.grayscale ? ("grayscale(" + (((numbers(a.grayscale, b.grayscale, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.hueRotate || b.hueRotate ? ("hue-rotate(" + (((numbers(a.hueRotate, b.hueRotate, v) * 100) >> 0) / 100) + "deg)") : '')
                              + (a.sepia || b.sepia ? ("sepia(" + (((numbers(a.sepia, b.sepia, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.brightness || b.brightness ? ("brightness(" + (((numbers(a.brightness, b.brightness, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.contrast || b.contrast ? ("contrast(" + (((numbers(a.contrast, b.contrast, v) * 100) >> 0) / 100) + "%)") : '')
                              + (a.dropShadow || b.dropShadow ? dropShadow(a.dropShadow, b.dropShadow, v) : '');
      };
    }
  }

  /* filterEffects = {
    property: 'filter',
    subProperties: {},
    defaultValue: {},
    interpolators: {},
    functions = { prepareStart, prepareProperty, onStart, crossCheck }
  } */

  // Component Util
  function replaceDashNamespace(str) {
    return str.replace('-r', 'R').replace('-s', 'S');
  }

  function parseDropShadow(shadow) {
    var newShadow;

    if (shadow.length === 3) { // [h-shadow, v-shadow, color]
      newShadow = [shadow[0], shadow[1], 0, shadow[2]];
    } else if (shadow.length === 4) { // ideal [<offset-x>, <offset-y>, <blur-radius>, <color>]
      newShadow = [shadow[0], shadow[1], shadow[2], shadow[3]];
    }

    // make sure the values are ready to tween
    for (var i = 0; i < 3; i += 1) {
      newShadow[i] = parseFloat(newShadow[i]);
    }
    // also the color must be a rgb object
    newShadow[3] = trueColor(newShadow[3]);
    return newShadow;
  }

  function parseFilterString(currentStyle) {
    var result = {};
    var fnReg = /(([a-z].*?)\(.*?\))(?=\s([a-z].*?)\(.*?\)|\s*$)/g;
    var matches = currentStyle.match(fnReg);
    var fnArray = currentStyle !== 'none' ? matches : 'none';

    if (fnArray instanceof Array) {
      for (var j = 0, jl = fnArray.length; j < jl; j += 1) {
        var p = fnArray[j].trim().split(/\((.+)/);
        var pp = replaceDashNamespace(p[0]);
        if (pp === 'dropShadow') {
          var shadowColor = p[1].match(/(([a-z].*?)\(.*?\))(?=\s(.*?))/)[0];
          var params = p[1].replace(shadowColor, '').split(/\s/).map(parseFloat);
          result[pp] = params.filter(function (el) { return !Number.isNaN(el); }).concat(shadowColor);
        } else {
          result[pp] = p[1].replace(/'|"|\)/g, '');
        }
      }
    }

    return result;
  }

  // Component Functions
  function getFilter(tweenProp, value) {
    var currentStyle = getStyleForProperty(this.element, tweenProp);
    var filterObject = parseFilterString(currentStyle);
    var fnp;

    Object.keys(value).forEach(function (fn) {
      fnp = replaceDashNamespace(fn);
      if (!filterObject[fnp]) {
        filterObject[fnp] = defaultValues[tweenProp][fn];
      }
    });

    return filterObject;
  }
  function prepareFilter(tweenProp, value) {
    var filterObject = {};
    var fnp;

    // property: range | default
    // opacity: [0-100%] | 100
    // blur: [0-Nem] | 0
    // saturate: [0-N%] | 100
    // invert: [0-100%] | 0
    // grayscale: [0-100%] | 0
    // brightness: [0-N%] | 100
    // contrast: [0-N%] | 100
    // sepia: [0-N%] | 0
    // 'hueRotate': [0-Ndeg] | 0
    // 'dropShadow': [0,0,0,(r:0,g:0,b:0)] | 0
    // url: '' | ''

    Object.keys(value).forEach(function (fn) {
      fnp = replaceDashNamespace(fn);
      if (/hue/.test(fn)) {
        filterObject[fnp] = parseFloat(value[fn]);
      } else if (/drop/.test(fn)) {
        filterObject[fnp] = parseDropShadow(value[fn]);
      } else if (fn === 'url') {
        filterObject[fn] = value[fn];
      // } else if ( /blur|opacity|grayscale|sepia/.test(fn) ) {
      } else {
        filterObject[fn] = parseFloat(value[fn]);
      }
    });

    return filterObject;
  }

  function crossCheckFilter(tweenProp) {
    var this$1$1 = this;

    if (this.valuesEnd[tweenProp]) {
      Object.keys(this.valuesStart[tweenProp]).forEach(function (fn) {
        if (!this$1$1.valuesEnd[tweenProp][fn]) {
          this$1$1.valuesEnd[tweenProp][fn] = this$1$1.valuesStart[tweenProp][fn];
        }
      });
    }
  }

  // All Component Functions
  var filterFunctions = {
    prepareStart: getFilter,
    prepareProperty: prepareFilter,
    onStart: onStartFilter,
    crossCheck: crossCheckFilter,
  };

  // Full Component
  var filterEffects = {
    component: 'filterEffects',
    property: 'filter',
    // opacity function interfere with opacityProperty
    // subProperties: [
    //   'blur', 'brightness','contrast','dropShadow',
    //   'hueRotate','grayscale','invert','opacity','saturate','sepia','url'
    // ],
    defaultValue: {
      opacity: 100,
      blur: 0,
      saturate: 100,
      grayscale: 0,
      brightness: 100,
      contrast: 100,
      sepia: 0,
      invert: 0,
      hueRotate: 0,
      dropShadow: [0, 0, 0, { r: 0, g: 0, b: 0 }],
      url: '',
    },
    Interpolate: {
      opacity: numbers,
      blur: numbers,
      saturate: numbers,
      grayscale: numbers,
      brightness: numbers,
      contrast: numbers,
      sepia: numbers,
      invert: numbers,
      hueRotate: numbers,
      dropShadow: { numbers: numbers, colors: colors, dropShadow: dropShadow },
    },
    functions: filterFunctions,
    Util: {
      parseDropShadow: parseDropShadow, parseFilterString: parseFilterString, replaceDashNamespace: replaceDashNamespace, trueColor: trueColor,
    },
  };

  // Component Special
  var attributes = {};

  var onStartAttr = {
    attr: function attr(tweenProp) {
      if (!KUTE[tweenProp] && this.valuesEnd[tweenProp]) {
        KUTE[tweenProp] = function (elem, vS, vE, v) {
          Object.keys(vE).forEach(function (oneAttr) {
            KUTE.attributes[oneAttr](elem, oneAttr, vS[oneAttr], vE[oneAttr], v);
          });
        };
      }
    },
    attributes: function attributes$1(tweenProp) {
      if (!KUTE[tweenProp] && this.valuesEnd.attr) {
        KUTE[tweenProp] = attributes;
      }
    },
  };

  // Component Name
  var ComponentName = 'htmlAttributes';

  // Component Properties
  var svgColors = ['fill', 'stroke', 'stop-color'];

  // Component Util
  function replaceUppercase(a) { return a.replace(/[A-Z]/g, '-$&').toLowerCase(); }

  // Component Functions
  function getAttr(tweenProp, value) {
    var this$1$1 = this;

    var attrStartValues = {};
    Object.keys(value).forEach(function (attr) {
      // get the value for 'fill-opacity' not fillOpacity, also 'width' not the internal 'width_px'
      var attribute = replaceUppercase(attr).replace(/_+[a-z]+/, '');
      var currentValue = this$1$1.element.getAttribute(attribute);
      attrStartValues[attribute] = svgColors.includes(attribute)
        ? (currentValue || 'rgba(0,0,0,0)')
        : (currentValue || (/opacity/i.test(attr) ? 1 : 0));
    });

    return attrStartValues;
  }

  function prepareAttr(tweenProp, attrObj) {
    var this$1$1 = this;
   // attr (string),attrObj (object)
    var attributesObject = {};

    Object.keys(attrObj).forEach(function (p) {
      var prop = replaceUppercase(p);
      var regex = /(%|[a-z]+)$/;
      var currentValue = this$1$1.element.getAttribute(prop.replace(/_+[a-z]+/, ''));

      if (!svgColors.includes(prop)) {
        // attributes set with unit suffixes
        if (currentValue !== null && regex.test(currentValue)) {
          var unit = trueDimension(currentValue).u || trueDimension(attrObj[p]).u;
          var suffix = /%/.test(unit) ? '_percent' : ("_" + unit);

          // most "unknown" attributes cannot register into onStart, so we manually add them
          onStart[ComponentName][prop + suffix] = function (tp) {
            if (this$1$1.valuesEnd[tweenProp] && this$1$1.valuesEnd[tweenProp][tp] && !(tp in attributes)) {
              attributes[tp] = function (elem, oneAttr, a, b, v) {
                var _p = oneAttr.replace(suffix, '');
                elem.setAttribute(_p, ((numbers(a.v, b.v, v) * 1000 >> 0) / 1000) + b.u);
              };
            }
          };
          attributesObject[prop + suffix] = trueDimension(attrObj[p]);
        } else if (!regex.test(attrObj[p]) || currentValue === null
          || (currentValue !== null && !regex.test(currentValue))) {
          // most "unknown" attributes cannot register into onStart, so we manually add them
          onStart[ComponentName][prop] = function (tp) {
            if (this$1$1.valuesEnd[tweenProp] && this$1$1.valuesEnd[tweenProp][tp] && !(tp in attributes)) {
              attributes[tp] = function (elem, oneAttr, a, b, v) {
                elem.setAttribute(oneAttr, (numbers(a, b, v) * 1000 >> 0) / 1000);
              };
            }
          };
          attributesObject[prop] = parseFloat(attrObj[p]);
        }
      } else { // colors
        // most "unknown" attributes cannot register into onStart, so we manually add them
        onStart[ComponentName][prop] = function (tp) {
          if (this$1$1.valuesEnd[tweenProp] && this$1$1.valuesEnd[tweenProp][tp] && !(tp in attributes)) {
            attributes[tp] = function (elem, oneAttr, a, b, v) {
              elem.setAttribute(oneAttr, colors(a, b, v));
            };
          }
        };
        attributesObject[prop] = trueColor(attrObj[p]) || defaultValues.htmlAttributes[p];
      }
    });

    return attributesObject;
  }

  // All Component Functions
  var attrFunctions = {
    prepareStart: getAttr,
    prepareProperty: prepareAttr,
    onStart: onStartAttr,
  };

  // Component Full
  var htmlAttributes = {
    component: ComponentName,
    property: 'attr',
    // the Animation class will need some values to validate this Object attribute
    subProperties: ['fill', 'stroke', 'stop-color', 'fill-opacity', 'stroke-opacity'],
    defaultValue: {
      fill: 'rgb(0,0,0)',
      stroke: 'rgb(0,0,0)',
      'stop-color': 'rgb(0,0,0)',
      opacity: 1,
      'stroke-opacity': 1,
      'fill-opacity': 1, // same here
    },
    Interpolate: { numbers: numbers, colors: colors },
    functions: attrFunctions,
    // export to global for faster execution
    Util: { replaceUppercase: replaceUppercase, trueColor: trueColor, trueDimension: trueDimension },
  };

  /* opacityProperty = {
    property: 'opacity',
    defaultValue: 1,
    interpolators: {numbers},
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Functions
  function onStartOpacity(tweenProp/* , value */) {
    // opacity could be 0 sometimes, we need to check regardless
    if (tweenProp in this.valuesEnd && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.style[tweenProp] = ((numbers(a, b, v) * 1000) >> 0) / 1000;
      };
    }
  }

  /* opacityProperty = {
    property: 'opacity',
    defaultValue: 1,
    interpolators: {numbers},
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Functions
  function getOpacity(tweenProp/* , value */) {
    return getStyleForProperty(this.element, tweenProp);
  }

  function prepareOpacity(tweenProp, value) {
    return parseFloat(value); // opacity always FLOAT
  }

  // All Component Functions
  var opacityFunctions = {
    prepareStart: getOpacity,
    prepareProperty: prepareOpacity,
    onStart: onStartOpacity,
  };

  // Full Component
  var opacityProperty = {
    component: 'opacityProperty',
    property: 'opacity',
    defaultValue: 1,
    Interpolate: { numbers: numbers },
    functions: opacityFunctions,
  };

  /* svgDraw = {
    property: 'draw',
    defaultValue,
    Interpolate: {numbers} },
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Functions
  function onStartDraw(tweenProp) {
    if (tweenProp in this.valuesEnd && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        var pathLength = (a.l * 100 >> 0) / 100;
        var start = (numbers(a.s, b.s, v) * 100 >> 0) / 100;
        var end = (numbers(a.e, b.e, v) * 100 >> 0) / 100;
        var offset = 0 - start;
        var dashOne = end + offset;

        elem.style.strokeDashoffset = offset + "px";
        elem.style.strokeDasharray = (((dashOne < 1 ? 0 : dashOne) * 100 >> 0) / 100) + "px, " + pathLength + "px";
      };
    }
  }

  /* svgDraw = {
    property: 'draw',
    defaultValue,
    Interpolate: {numbers} },
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Util
  function percent(v, l) {
    return (parseFloat(v) / 100) * l;
  }

  // http://stackoverflow.com/a/30376660
  // returns the length of a Rect
  function getRectLength(el) {
    var w = el.getAttribute('width');
    var h = el.getAttribute('height');
    return (w * 2) + (h * 2);
  }

  // getPolygonLength / getPolylineLength
  // returns the length of the Polygon / Polyline
  function getPolyLength(el) {
    var points = el.getAttribute('points').split(' ');

    var len = 0;
    if (points.length > 1) {
      var coord = function (p) {
        var c = p.split(',');
        if (c.length !== 2) { return 0; } // return undefined
        if (Number.isNaN(c[0] * 1) || Number.isNaN(c[1] * 1)) { return 0; }
        return [parseFloat(c[0]), parseFloat(c[1])];
      };

      var dist = function (c1, c2) {
        if (c1 !== undefined && c2 !== undefined) {
          return Math.sqrt(Math.pow( (c2[0] - c1[0]), 2 ) + Math.pow( (c2[1] - c1[1]), 2 ));
        }
        return 0;
      };

      if (points.length > 2) {
        for (var i = 0; i < points.length - 1; i += 1) {
          len += dist(coord(points[i]), coord(points[i + 1]));
        }
      }
      len += el.tagName === 'polygon'
        ? dist(coord(points[0]), coord(points[points.length - 1])) : 0;
    }
    return len;
  }

  // return the length of the line
  function getLineLength(el) {
    var x1 = el.getAttribute('x1');
    var x2 = el.getAttribute('x2');
    var y1 = el.getAttribute('y1');
    var y2 = el.getAttribute('y2');
    return Math.sqrt(Math.pow( (x2 - x1), 2 ) + Math.pow( (y2 - y1), 2 ));
  }

  // return the length of the circle
  function getCircleLength(el) {
    var r = el.getAttribute('r');
    return 2 * Math.PI * r;
  }

  // returns the length of an ellipse
  function getEllipseLength(el) {
    var rx = el.getAttribute('rx');
    var ry = el.getAttribute('ry');
    var len = 2 * rx;
    var wid = 2 * ry;
    return ((Math.sqrt(0.5 * ((len * len) + (wid * wid)))) * (Math.PI * 2)) / 2;
  }

  // returns the result of any of the below functions
  function getTotalLength(el) {
    if (el.tagName === 'rect') {
      return getRectLength(el);
    } if (el.tagName === 'circle') {
      return getCircleLength(el);
    } if (el.tagName === 'ellipse') {
      return getEllipseLength(el);
    } if (['polygon', 'polyline'].includes(el.tagName)) {
      return getPolyLength(el);
    } if (el.tagName === 'line') {
      return getLineLength(el);
    }
    // ESLint
    return 0;
  }

  function getDraw(element, value) {
    var length = /path|glyph/.test(element.tagName)
      ? element.getTotalLength()
      : getTotalLength(element);
    var start;
    var end;
    var dasharray;
    var offset;

    if (value instanceof Object) {
      return value;
    } if (typeof value === 'string') {
      var v = value.split(/,|\s/);
      start = /%/.test(v[0]) ? percent(v[0].trim(), length) : parseFloat(v[0]);
      end = /%/.test(v[1]) ? percent(v[1].trim(), length) : parseFloat(v[1]);
    } else if (typeof value === 'undefined') {
      offset = parseFloat(getStyleForProperty(element, 'stroke-dashoffset'));
      dasharray = getStyleForProperty(element, 'stroke-dasharray').split(',');

      start = 0 - offset;
      end = parseFloat(dasharray[0]) + start || length;
    }
    return { s: start, e: end, l: length };
  }

  function resetDraw(elem) {
    elem.style.strokeDashoffset = '';
    elem.style.strokeDasharray = '';
  }

  // Component Functions
  function getDrawValue(/* prop, value */) {
    return getDraw(this.element);
  }
  function prepareDraw(a, o) {
    return getDraw(this.element, o);
  }

  // All Component Functions
  var svgDrawFunctions = {
    prepareStart: getDrawValue,
    prepareProperty: prepareDraw,
    onStart: onStartDraw,
  };

  // Component Full
  var svgDraw = {
    component: 'svgDraw',
    property: 'draw',
    defaultValue: '0% 0%',
    Interpolate: { numbers: numbers },
    functions: svgDrawFunctions,
    // Export to global for faster execution
    Util: {
      getRectLength: getRectLength,
      getPolyLength: getPolyLength,
      getLineLength: getLineLength,
      getCircleLength: getCircleLength,
      getEllipseLength: getEllipseLength,
      getTotalLength: getTotalLength,
      resetDraw: resetDraw,
      getDraw: getDraw,
      percent: percent,
    },
  };

  function clonePath(pathArray) {
    return pathArray.map(function (x) {
      if (Array.isArray(x)) {
        return clonePath(x);
      }
      return !Number.isNaN(+x) ? +x : x;
    });
  }

  var SVGPCO = {
    origin: null,
    decimals: 4,
    round: 1,
  };

  function roundPath(pathArray, round) {
    var decimalsOption = !Number.isNaN(+round) ? +round : SVGPCO.decimals;
    var result;

    if (decimalsOption) {
      result = pathArray.map(function (seg) { return seg.map(function (c) {
        var nr = +c;
        var dc = Math.pow( 10, decimalsOption );
        if (nr) {
          return nr % 1 === 0 ? nr : Math.round(nr * dc) / dc;
        }
        return c;
      }); });
    } else {
      result = clonePath(pathArray);
    }
    return result;
  }

  var paramsCount = {
    a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0,
  };

  function finalizeSegment(state) {
    var pathCommand = state.pathValue[state.segmentStart];
    var pathComLK = pathCommand.toLowerCase();
    var params = state.data;

    // Process duplicated commands (without comand name)
    if (pathComLK === 'm' && params.length > 2) {
      state.segments.push([pathCommand, params[0], params[1]]);
      params = params.slice(2);
      pathComLK = 'l';
      pathCommand = (pathCommand === 'm') ? 'l' : 'L';
    }

    if (pathComLK === 'r') {
      state.segments.push([pathCommand].concat(params));
    } else {
      while (params.length >= paramsCount[pathComLK]) {
        state.segments.push([pathCommand].concat(params.splice(0, paramsCount[pathComLK])));
        if (!paramsCount[pathComLK]) {
          break;
        }
      }
    }
  }

  var invalidPathValue = 'Invalid path value';

  function scanFlag(state) {
    var ch = state.pathValue.charCodeAt(state.index);

    if (ch === 0x30/* 0 */) {
      state.param = 0;
      state.index += 1;
      return;
    }

    if (ch === 0x31/* 1 */) {
      state.param = 1;
      state.index += 1;
      return;
    }

    // state.err = 'SvgPath: arc flag can be 0 or 1 only (at pos ' + state.index + ')';
    state.err = invalidPathValue + ": invalid Arc flag " + ch;
  }

  function isDigit(code) {
    return (code >= 48 && code <= 57); // 0..9
  }

  function scanParam(state) {
    var start = state.index;
    var max = state.max;
    var index = start;
    var zeroFirst = false;
    var hasCeiling = false;
    var hasDecimal = false;
    var hasDot = false;
    var ch;

    if (index >= max) {
      // state.err = 'SvgPath: missed param (at pos ' + index + ')';
      state.err = invalidPathValue + ": missing param " + (state.pathValue[index]);
      return;
    }
    ch = state.pathValue.charCodeAt(index);

    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
      index += 1;
      ch = (index < max) ? state.pathValue.charCodeAt(index) : 0;
    }

    // This logic is shamelessly borrowed from Esprima
    // https://github.com/ariya/esprimas
    if (!isDigit(ch) && ch !== 0x2E/* . */) {
      // state.err = 'SvgPath: param should start with 0..9 or `.` (at pos ' + index + ')';
      state.err = invalidPathValue + " at index " + index + ": " + (state.pathValue[index]) + " is not a number";
      return;
    }

    if (ch !== 0x2E/* . */) {
      zeroFirst = (ch === 0x30/* 0 */);
      index += 1;

      ch = (index < max) ? state.pathValue.charCodeAt(index) : 0;

      if (zeroFirst && index < max) {
        // decimal number starts with '0' such as '09' is illegal.
        if (ch && isDigit(ch)) {
          // state.err = 'SvgPath: numbers started with `0` such as `09`
          // are illegal (at pos ' + start + ')';
          state.err = invalidPathValue + ": " + (state.pathValue[start]) + " illegal number";
          return;
        }
      }

      while (index < max && isDigit(state.pathValue.charCodeAt(index))) {
        index += 1;
        hasCeiling = true;
      }
      ch = (index < max) ? state.pathValue.charCodeAt(index) : 0;
    }

    if (ch === 0x2E/* . */) {
      hasDot = true;
      index += 1;
      while (isDigit(state.pathValue.charCodeAt(index))) {
        index += 1;
        hasDecimal = true;
      }
      ch = (index < max) ? state.pathValue.charCodeAt(index) : 0;
    }

    if (ch === 0x65/* e */ || ch === 0x45/* E */) {
      if (hasDot && !hasCeiling && !hasDecimal) {
        // state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
        state.err = invalidPathValue + ": " + (state.pathValue[index]) + " invalid float exponent";
        return;
      }

      index += 1;

      ch = (index < max) ? state.pathValue.charCodeAt(index) : 0;
      if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
        index += 1;
      }
      if (index < max && isDigit(state.pathValue.charCodeAt(index))) {
        while (index < max && isDigit(state.pathValue.charCodeAt(index))) {
          index += 1;
        }
      } else {
        // state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
        state.err = invalidPathValue + ": " + (state.pathValue[index]) + " invalid float exponent";
        return;
      }
    }

    state.index = index;
    state.param = +state.pathValue.slice(start, index);
  }

  function isSpace(ch) {
    var specialSpaces = [
      0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
      0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF];
    return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029) // Line terminators
      // White spaces
      || (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0)
      || (ch >= 0x1680 && specialSpaces.indexOf(ch) >= 0);
  }

  function skipSpaces(state) {
    while (state.index < state.max && isSpace(state.pathValue.charCodeAt(state.index))) {
      state.index += 1;
    }
  }

  function isPathCommand(code) {
    // eslint-disable no-bitwise
    switch (code | 0x20) {
      case 0x6D/* m */:
      case 0x7A/* z */:
      case 0x6C/* l */:
      case 0x68/* h */:
      case 0x76/* v */:
      case 0x63/* c */:
      case 0x73/* s */:
      case 0x71/* q */:
      case 0x74/* t */:
      case 0x61/* a */:
      case 0x72/* r */:
        return true;
      default:
        return false;
    }
  }

  function isDigitStart(code) {
    return (code >= 48 && code <= 57) /* 0..9 */
      || code === 0x2B /* + */
      || code === 0x2D /* - */
      || code === 0x2E; /* . */
  }

  function isArcCommand(code) {
    // eslint disable no-bitwise
    return (code | 0x20) === 0x61;
  }

  function scanSegment(state) {
    var max = state.max;
    var cmdCode = state.pathValue.charCodeAt(state.index);
    var reqParams = paramsCount[state.pathValue[state.index].toLowerCase()];
    // let hasComma;

    state.segmentStart = state.index;

    if (!isPathCommand(cmdCode)) {
      // state.err = 'SvgPath: bad command '
      // + state.pathValue[state.index]
      // + ' (at pos ' + state.index + ')';
      state.err = invalidPathValue + ": " + (state.pathValue[state.index]) + " not a path command";
      return;
    }

    state.index += 1;
    skipSpaces(state);

    state.data = [];

    if (!reqParams) {
      // Z
      finalizeSegment(state);
      return;
    }

    // hasComma = false;

    for (;;) {
      for (var i = reqParams; i > 0; i -= 1) {
        if (isArcCommand(cmdCode) && (i === 3 || i === 4)) { scanFlag(state); }
        else { scanParam(state); }

        if (state.err.length) {
          return;
        }
        state.data.push(state.param);

        skipSpaces(state);
        // hasComma = false;

        if (state.index < max && state.pathValue.charCodeAt(state.index) === 0x2C/* , */) {
          state.index += 1;
          skipSpaces(state);
          // hasComma = true;
        }
      }

      // after ',' param is mandatory
      // if (hasComma) {
      //   continue;
      // }

      if (state.index >= state.max) {
        break;
      }

      // Stop on next segment
      if (!isDigitStart(state.pathValue.charCodeAt(state.index))) {
        break;
      }
    }

    finalizeSegment(state);
  }

  function SVGPathArray(pathString) {
    this.segments = [];
    this.pathValue = pathString;
    this.max = pathString.length;
    this.index = 0;
    this.param = 0.0;
    this.segmentStart = 0;
    this.data = [];
    this.err = '';
    // return this;
  }

  function isPathArray(pathArray) {
    return Array.isArray(pathArray) && pathArray.every(function (seg) {
      var pathCommand = seg[0].toLowerCase();
      return paramsCount[pathCommand] === seg.length - 1 && /[achlmrqstvz]/g.test(pathCommand);
    });
  }

  // Returns array of segments:
  function parsePathString(pathString, round) {
    if (isPathArray(pathString)) {
      return clonePath(pathString);
    }

    var state = new SVGPathArray(pathString);

    skipSpaces(state);

    while (state.index < state.max && !state.err.length) {
      scanSegment(state);
    }

    if (state.err.length) {
      state.segments = [];
    } else if (state.segments.length) {
      if ('mM'.indexOf(state.segments[0][0]) < 0) {
        // state.err = 'Path string should start with `M` or `m`';
        state.err = invalidPathValue + ": missing M/m";
        state.segments = [];
      } else {
        state.segments[0][0] = 'M';
      }
    }

    return roundPath(state.segments, round);
  }

  function isAbsoluteArray(pathInput) {
    return isPathArray(pathInput) && pathInput.every(function (x) { return x[0] === x[0].toUpperCase(); });
  }

  function pathToAbsolute(pathInput, round) {
    if (isAbsoluteArray(pathInput)) {
      return clonePath(pathInput);
    }

    var pathArray = parsePathString(pathInput, round);
    var ii = pathArray.length;
    var resultArray = [];
    var x = 0;
    var y = 0;
    var mx = 0;
    var my = 0;
    var start = 0;

    if (pathArray[0][0] === 'M') {
      x = +pathArray[0][1];
      y = +pathArray[0][2];
      mx = x;
      my = y;
      start += 1;
      resultArray.push(['M', x, y]);
    }

    for (var i = start; i < ii; i += 1) {
      var segment = pathArray[i];
      var pathCommand = segment[0];
      var absCommand = pathCommand.toUpperCase();
      var absoluteSegment = [];
      var newSeg = [];
      resultArray.push(absoluteSegment);

      if (pathCommand !== absCommand) {
        absoluteSegment[0] = absCommand;

        switch (absCommand) {
          case 'A':
            newSeg = segment.slice(1, -2).concat([+segment[6] + x, +segment[7] + y]);
            for (var j = 0; j < newSeg.length; j += 1) {
              absoluteSegment.push(newSeg[j]);
            }
            break;
          case 'V':
            absoluteSegment[1] = +segment[1] + y;
            break;
          case 'H':
            absoluteSegment[1] = +segment[1] + x;
            break;
          default:
            if (absCommand === 'M') {
              mx = +segment[1] + x;
              my = +segment[2] + y;
            }
            // for is here to stay for eslint
            for (var j$1 = 1; j$1 < segment.length; j$1 += 1) {
              absoluteSegment.push(+segment[j$1] + (j$1 % 2 ? x : y));
            }
        }
      } else {
        for (var j$2 = 0; j$2 < segment.length; j$2 += 1) {
          absoluteSegment.push(segment[j$2]);
        }
      }

      var segLength = absoluteSegment.length;
      switch (absCommand) {
        case 'Z':
          x = mx;
          y = my;
          break;
        case 'H':
          x = +absoluteSegment[1];
          break;
        case 'V':
          y = +absoluteSegment[1];
          break;
        default:
          x = +absoluteSegment[segLength - 2];
          y = +absoluteSegment[segLength - 1];

          if (absCommand === 'M') {
            mx = x;
            my = y;
          }
      }
    }

    return roundPath(resultArray, round);
  }

  function fixArc(pathArray, allPathCommands, i) {
    if (pathArray[i].length > 7) {
      pathArray[i].shift();
      var pi = pathArray[i];
      // const ni = i + 1;
      var ni = i;
      while (pi.length) {
        // if created multiple C:s, their original seg is saved
        allPathCommands[i] = 'A';
        pathArray.splice(ni += 1, 0, ['C'].concat(pi.splice(0, 6)));
        // pathArray.splice(i += 1, 0, ['C'].concat(pi.splice(0, 6)));
        // pathArray.splice(i++, 0, ['C'].concat(pi.splice(0, 6)));
      }
      pathArray.splice(i, 1);
    }
  }

  function isCurveArray(pathArray) {
    return isPathArray(pathArray) && pathArray.slice(1).every(function (seg) { return seg[0] === 'C'; });
  }

  // returns {qx,qy} for shorthand quadratic bezier segments
  function shorthandToQuad(x1, y1, qx, qy, prevCommand) {
    return 'QT'.indexOf(prevCommand) > -1
      ? { qx: x1 * 2 - qx, qy: y1 * 2 - qy }
      : { qx: x1, qy: y1 };
  }

  // returns {x1,x2} for shorthand cubic bezier segments
  function shorthandToCubic(x1, y1, x2, y2, prevCommand) {
    return 'CS'.indexOf(prevCommand) > -1
      ? { x1: x1 * 2 - x2, y1: y1 * 2 - y2 }
      : { x1: x1, y1: y1 };
  }

  function normalizeSegment(segment, params, prevCommand) {
    var pathCommand = segment[0];
    var xy = segment.slice(1);
    var result = segment;

    if ('TQ'.indexOf(segment[0]) < 0) {
      // optional but good to be cautious
      params.qx = null;
      params.qy = null;
    }

    if (pathCommand === 'H') {
      result = ['L', segment[1], params.y1];
    } else if (pathCommand === 'V') {
      result = ['L', params.x1, segment[1]];
    } else if (pathCommand === 'S') {
      var ref = shorthandToCubic(params.x1, params.y1, params.x2, params.y2, prevCommand);
      var x1 = ref.x1;
      var y1 = ref.y1;
      params.x1 = x1;
      params.y1 = y1;
      result = ['C', x1, y1].concat(xy);
    } else if (pathCommand === 'T') {
      var ref$1 = shorthandToQuad(params.x1, params.y1, params.qx, params.qy, prevCommand);
      var qx = ref$1.qx;
      var qy = ref$1.qy;
      params.qx = qx;
      params.qy = qy;
      result = ['Q', qx, qy].concat(xy);
    } else if (pathCommand === 'Q') {
      var nqx = xy[0];
      var nqy = xy[1];
      params.qx = nqx;
      params.qy = nqy;
    }
    return result;
  }

  function isNormalizedArray(pathArray) {
    return Array.isArray(pathArray) && pathArray.every(function (seg) {
      var pathCommand = seg[0].toLowerCase();
      return paramsCount[pathCommand] === seg.length - 1 && /[ACLMQZ]/.test(seg[0]); // achlmrqstvz
    });
  }

  function normalizePath(pathInput, round) { // pathArray|pathString
    if (isNormalizedArray(pathInput)) {
      return clonePath(pathInput);
    }

    var pathArray = pathToAbsolute(pathInput, round);
    var params = {
      x1: 0, y1: 0, x2: 0, y2: 0, x: 0, y: 0, qx: null, qy: null,
    };
    var allPathCommands = [];
    var ii = pathArray.length;
    var prevCommand = '';
    var segment;
    var seglen;

    for (var i = 0; i < ii; i += 1) {
      // save current path command
      var ref = pathArray[i];
      var pathCommand = ref[0];

      // Save current path command
      allPathCommands[i] = pathCommand;
      // Get previous path command
      if (i) { prevCommand = allPathCommands[i - 1]; }
      // Previous path command is inputted to processSegment
      pathArray[i] = normalizeSegment(pathArray[i], params, prevCommand);

      segment = pathArray[i];
      seglen = segment.length;

      params.x1 = +segment[seglen - 2];
      params.y1 = +segment[seglen - 1];
      params.x2 = +(segment[seglen - 4]) || params.x1;
      params.y2 = +(segment[seglen - 3]) || params.y1;
    }
    return roundPath(pathArray, round);
  }

  function rotateVector(x, y, rad) {
    var X = x * Math.cos(rad) - y * Math.sin(rad);
    var Y = x * Math.sin(rad) + y * Math.cos(rad);
    return { x: X, y: Y };
  }

  // for more information of where this math came from visit:
  // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
  // LAF = largeArcFlag, SF = sweepFlag

  function arcToCubic(x1, y1, rx, ry, angle, LAF, SF, x2, y2, recursive) {
    var d120 = (Math.PI * 120) / 180;
    var rad = (Math.PI / 180) * (angle || 0);
    var res = [];
    var X1 = x1;
    var X2 = x2;
    var Y1 = y1;
    var Y2 = y2;
    var RX = rx;
    var RY = ry;
    var xy;
    var f1;
    var f2;
    var cx;
    var cy;

    if (!recursive) {
      xy = rotateVector(X1, Y1, -rad);
      X1 = xy.x;
      Y1 = xy.y;
      xy = rotateVector(X2, Y2, -rad);
      X2 = xy.x;
      Y2 = xy.y;

      var x = (X1 - X2) / 2;
      var y = (Y1 - Y2) / 2;
      var h = (x * x) / (RX * RY) + (Math.pow( y, 2 )) / (Math.pow( RY, 2 ));
      if (h > 1) {
        h = Math.sqrt(h);
        RX *= h;
        RY *= h;
      }
      var rx2 = Math.pow( RX, 2 );
      var ry2 = Math.pow( RY, 2 );
      var k = (LAF === SF ? -1 : 1)
            * Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x)
            / (rx2 * y * y + ry2 * x * x)));

      cx = ((k * RX * y) / RY) + ((X1 + X2) / 2);
      cy = ((k * -RY * x) / RX) + ((Y1 + Y2) / 2);

      // f1 = Math.asin(((Y1 - cy) / RY).toFixed(9)); // keep toFIxed(9)!
      // f2 = Math.asin(((Y2 - cy) / RY).toFixed(9));
      f1 = Math.asin((((Y1 - cy) / RY) * Math.pow( 10, 9 ) >> 0) / (Math.pow( 10, 9 )));
      f2 = Math.asin((((Y2 - cy) / RY) * Math.pow( 10, 9 ) >> 0) / (Math.pow( 10, 9 )));

      f1 = X1 < cx ? Math.PI - f1 : f1;
      f2 = X2 < cx ? Math.PI - f2 : f2;

      if (f1 < 0) { f1 = Math.PI * 2 + f1; }
      if (f2 < 0) { f2 = Math.PI * 2 + f2; }

      if (SF && f1 > f2) {
        f1 -= Math.PI * 2;
      }
      if (!SF && f2 > f1) {
        f2 -= Math.PI * 2;
      }
    } else {
      var r1 = recursive[0];
      var r2 = recursive[1];
      var r3 = recursive[2];
      var r4 = recursive[3];
      f1 = r1;
      f2 = r2;
      cx = r3;
      cy = r4;
    }

    var df = f2 - f1;

    if (Math.abs(df) > d120) {
      var f2old = f2; var x2old = X2; var
        y2old = Y2;

      f2 = f1 + d120 * (SF && f2 > f1 ? 1 : -1);
      X2 = cx + RX * Math.cos(f2);
      Y2 = cy + RY * Math.sin(f2);
      res = arcToCubic(X2, Y2, RX, RY, angle, 0, SF, x2old, y2old, [f2, f2old, cx, cy]);
    }

    df = f2 - f1;
    var c1 = Math.cos(f1);
    var s1 = Math.sin(f1);
    var c2 = Math.cos(f2);
    var s2 = Math.sin(f2);
    var t = Math.tan(df / 4);
    var hx = (4 / 3) * RX * t;
    var hy = (4 / 3) * RY * t;
    var m1 = [X1, Y1];
    var m2 = [X1 + hx * s1, Y1 - hy * c1];
    var m3 = [X2 + hx * s2, Y2 - hy * c2];
    var m4 = [X2, Y2];
    m2[0] = 2 * m1[0] - m2[0];
    m2[1] = 2 * m1[1] - m2[1];

    if (recursive) {
      return [m2, m3, m4].concat(res);
    }
    res = [m2, m3, m4].concat(res).join().split(',');
    return res.map(function (rz, i) {
      if (i % 2) {
        return rotateVector(res[i - 1], rz, rad).y;
      }
      return rotateVector(rz, res[i + 1], rad).x;
    });
  }

  function quadToCubic(x1, y1, qx, qy, x2, y2) {
    var r13 = 1 / 3;
    var r23 = 2 / 3;
    return [
      r13 * x1 + r23 * qx, // cpx1
      r13 * y1 + r23 * qy, // cpy1
      r13 * x2 + r23 * qx, // cpx2
      r13 * y2 + r23 * qy, // cpy2
      x2, y2 ];
  }

  // t = [0-1]
  function getPointAtSegLength(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
    var t1 = 1 - t;
    return {
      x: (Math.pow( t1, 3 )) * p1x
        + t1 * t1 * 3 * t * c1x
        + t1 * 3 * t * t * c2x
        + (Math.pow( t, 3 )) * p2x,
      y: (Math.pow( t1, 3 )) * p1y
        + t1 * t1 * 3 * t * c1y
        + t1 * 3 * t * t * c2y
        + (Math.pow( t, 3 )) * p2y,
    };
  }

  function midPoint(a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var bx = b[0];
    var by = b[1];
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  }

  function lineToCubic(x1, y1, x2, y2) {
    var t = 0.5;
    var p0 = [x1, y1];
    var p1 = [x2, y2];
    var p2 = midPoint(p0, p1, t);
    var p3 = midPoint(p1, p2, t);
    var p4 = midPoint(p2, p3, t);
    var p5 = midPoint(p3, p4, t);
    var p6 = midPoint(p4, p5, t);
    var cp1 = getPointAtSegLength.apply(0, p0.concat(p2, p4, p6, t));
    var cp2 = getPointAtSegLength.apply(0, p6.concat(p5, p3, p1, 0));

    return [cp1.x, cp1.y, cp2.x, cp2.y, x2, y2];
  }

  function segmentToCubic(segment, params) {
    if ('TQ'.indexOf(segment[0]) < 0) {
      params.qx = null;
      params.qy = null;
    }

    var ref = segment.slice(1);
    var s1 = ref[0];
    var s2 = ref[1];

    switch (segment[0]) {
      case 'M':
        params.x = s1;
        params.y = s2;
        return segment;
      case 'A':
        return ['C'].concat(arcToCubic.apply(0, [params.x1, params.y1].concat(segment.slice(1))));
      case 'Q':
        params.qx = s1;
        params.qy = s2;
        return ['C'].concat(quadToCubic.apply(0, [params.x1, params.y1].concat(segment.slice(1))));
      case 'L':
        return ['C'].concat(lineToCubic(params.x1, params.y1, segment[1], segment[2]));
      case 'Z':
        return ['C'].concat(lineToCubic(params.x1, params.y1, params.x, params.y));
    }
    return segment;
  }

  function pathToCurve(pathInput, round) {
    var assign;
   // pathArray|pathString
    if (isCurveArray(pathInput)) {
      return clonePath(pathInput);
    }

    var pathArray = normalizePath(pathInput, round);
    var params = {
      x1: 0, y1: 0, x2: 0, y2: 0, x: 0, y: 0, qx: null, qy: null,
    };
    var allPathCommands = [];
    var pathCommand = '';
    var ii = pathArray.length;
    var segment;
    var seglen;

    for (var i = 0; i < ii; i += 1) {
      if (pathArray[i]) { (assign = pathArray[i], pathCommand = assign[0]); }

      allPathCommands[i] = pathCommand;
      pathArray[i] = segmentToCubic(pathArray[i], params);

      fixArc(pathArray, allPathCommands, i);
      ii = pathArray.length; // solves curveArrays ending in Z

      segment = pathArray[i];
      seglen = segment.length;

      params.x1 = +segment[seglen - 2];
      params.y1 = +segment[seglen - 1];
      params.x2 = +(segment[seglen - 4]) || params.x1;
      params.y2 = +(segment[seglen - 3]) || params.y1;
    }
    return roundPath(pathArray, round);
  }

  function pathToString(pathArray) {
    return pathArray.map(function (x) { return x[0].concat(x.slice(1).join(' ')); }).join('');
  }

  // reverse CURVE based pathArray segments only
  function reverseCurve(pathArray) {
    var rotatedCurve = pathArray.slice(1)
      .map(function (x, i, curveOnly) { return (!i
        ? pathArray[0].slice(1).concat(x.slice(1))
        : curveOnly[i - 1].slice(-2).concat(x.slice(1))); })
      .map(function (x) { return x.map(function (y, i) { return x[x.length - i - 2 * (1 - (i % 2))]; }); })
      .reverse();

    return [['M'].concat(rotatedCurve[0]
      .slice(0, 2))]
      .concat(rotatedCurve.map(function (x) { return ['C'].concat(x.slice(2)); }));
  }

  // https://github.com/paperjs/paper.js/blob/develop/src/path/Path.js

  function getCubicSegArea(x0, y0, x1, y1, x2, y2, x3, y3) {
    // http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
    return (3 * ((y3 - y0) * (x1 + x2) - (x3 - x0) * (y1 + y2)
             + (y1 * (x0 - x2)) - (x1 * (y0 - y2))
             + (y3 * (x2 + x0 / 3)) - (x3 * (y2 + y0 / 3)))) / 20;
  }

  function getPathArea(pathArray, round) {
    var x = 0; var y = 0; var mx = 0; var my = 0; var
      len = 0;
    return pathToCurve(pathArray, round).map(function (seg) {
      var assign;

      switch (seg[0]) {
        case 'M':
        case 'Z':
          mx = seg[0] === 'M' ? seg[1] : mx;
          my = seg[0] === 'M' ? seg[2] : my;
          x = mx;
          y = my;
          return 0;
        default:
          len = getCubicSegArea.apply(0, [x, y].concat(seg.slice(1)));
          (assign = seg.slice(-2), x = assign[0], y = assign[1]);
          return len;
      }
    }).reduce(function (a, b) { return a + b; }, 0);
  }

  function getDrawDirection(pathArray, round) {
    return getPathArea(pathToCurve(pathArray, round)) >= 0;
  }

  function splitCubic(pts, marker) {
    var t = marker || 0.5;
    var p0 = pts.slice(0, 2);
    var p1 = pts.slice(2, 4);
    var p2 = pts.slice(4, 6);
    var p3 = pts.slice(6, 8);
    var p4 = midPoint(p0, p1, t);
    var p5 = midPoint(p1, p2, t);
    var p6 = midPoint(p2, p3, t);
    var p7 = midPoint(p4, p5, t);
    var p8 = midPoint(p5, p6, t);
    var p9 = midPoint(p7, p8, t);

    return [
      ['C'].concat(p4, p7, p9),
      ['C'].concat(p8, p6, p3) ];
  }

  function splitPath(pathInput) {
    return pathToString(pathToAbsolute(pathInput, 0))
      .replace(/(m|M)/g, '|$1')
      .split('|')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });
  }

  function base3(p1, p2, p3, p4, t) {
    var t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4;
    var t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
    return t * t2 - 3 * p1 + 3 * p2;
  }

  // returns the cubic bezier segment length
  function getSegCubicLength(x1, y1, x2, y2, x3, y3, x4, y4, z) {
    var Z;
    if (z === null || Number.isNaN(+z)) { Z = 1; }

    // Z = Z > 1 ? 1 : Z < 0 ? 0 : Z;
    if (Z > 1) { Z = 1; }
    if (Z < 0) { Z = 0; }

    var z2 = Z / 2; var ct = 0; var xbase = 0; var ybase = 0; var sum = 0;
    var Tvalues = [-0.1252, 0.1252, -0.3678, 0.3678,
      -0.5873, 0.5873, -0.7699, 0.7699,
      -0.9041, 0.9041, -0.9816, 0.9816];
    var Cvalues = [0.2491, 0.2491, 0.2335, 0.2335,
      0.2032, 0.2032, 0.1601, 0.1601,
      0.1069, 0.1069, 0.0472, 0.0472];

    Tvalues.forEach(function (T, i) {
      ct = z2 * T + z2;
      xbase = base3(x1, x2, x3, x4, ct);
      ybase = base3(y1, y2, y3, y4, ct);
      sum += Cvalues[i] * Math.sqrt(xbase * xbase + ybase * ybase);
    });
    return z2 * sum;
  }

  function distanceSquareRoot(a, b) {
    return Math.sqrt(
      (a[0] - b[0]) * (a[0] - b[0])
      + (a[1] - b[1]) * (a[1] - b[1])
    );
  }

  /* SVGMorph = {
    property: 'path',
    defaultValue: [],
    interpolators: {numbers} },
    functions = { prepareStart, prepareProperty, onStart, crossCheck }
  } */

  // Component Functions
  function onStartCubicMorph(tweenProp) {
    if (!KUTE[tweenProp] && this.valuesEnd[tweenProp]) {
      KUTE[tweenProp] = function updateMorph(elem, a, b, v) {
        var curve = [];
        var path1 = a.curve;
        var path2 = b.curve;
        for (var i = 0, l = path2.length; i < l; i += 1) { // each path command
          curve.push([path1[i][0]]);
          for (var j = 1, l2 = path1[i].length; j < l2; j += 1) { // each command coordinate
            curve[i].push((numbers(path1[i][j], path2[i][j], v) * 1000 >> 0) / 1000);
          }
        }
        elem.setAttribute('d', v === 1 ? b.original : pathToString(curve));
      };
    }
  }

  /* SVGMorph = {
    property: 'path',
    defaultValue: [],
    interpolators: {numbers},
    functions = { prepareStart, prepareProperty, onStart, crossCheck }
  } */

  // Component Util
  function getCurveArray(pathString) {
    return pathToCurve(splitPath(pathToString(pathToAbsolute(pathString)))[0])
      .map(function (segment, i, pathArray) {
        var segmentData = i && pathArray[i - 1].slice(-2).concat(segment.slice(1));
        var curveLength = i ? getSegCubicLength.apply(0, segmentData) : 0;

        var subsegs;
        if (i) {
          // must be [segment,segment]
          subsegs = curveLength ? splitCubic(segmentData) : [segment, segment];
        } else {
          subsegs = [segment];
        }

        return {
          s: segment,
          ss: subsegs,
          l: curveLength,
        };
      });
  }

  function equalizeSegments(path1, path2, TL) {
    var c1 = getCurveArray(path1);
    var c2 = getCurveArray(path2);
    var L1 = c1.length;
    var L2 = c2.length;
    var l1 = c1.filter(function (x) { return x.l; }).length;
    var l2 = c2.filter(function (x) { return x.l; }).length;
    var m1 = c1.filter(function (x) { return x.l; }).reduce(function (a, ref) {
      var l = ref.l;

      return a + l;
    }, 0) / l1 || 0;
    var m2 = c2.filter(function (x) { return x.l; }).reduce(function (a, ref) {
      var l = ref.l;

      return a + l;
    }, 0) / l2 || 0;
    var tl = TL || Math.max(L1, L2);
    var mm = [m1, m2];
    var dif = [tl - L1, tl - L2];
    var canSplit = 0;
    var result = [c1, c2]
      .map(function (x, i) { return (x.l === tl
        ? x.map(function (y) { return y.s; })
        : x.map(function (y, j) {
          canSplit = j && dif[i] && y.l >= mm[i];
          dif[i] -= canSplit ? 1 : 0;
          return canSplit ? y.ss : [y.s];
        }).flat()); });

    return result[0].length === result[1].length
      ? result
      : equalizeSegments(result[0], result[1], tl);
  }

  function getRotations(a) {
    var segCount = a.length;
    var pointCount = segCount - 1;

    return a.map(function (f, idx) { return a.map(function (p, i) {
      var oldSegIdx = idx + i;
      var seg;

      if (i === 0 || (a[oldSegIdx] && a[oldSegIdx][0] === 'M')) {
        seg = a[oldSegIdx];
        return ['M'].concat(seg.slice(-2));
      }
      if (oldSegIdx >= segCount) { oldSegIdx -= pointCount; }
      return a[oldSegIdx];
    }); });
  }

  function getRotatedCurve(a, b) {
    var segCount = a.length - 1;
    var lineLengths = [];
    var computedIndex = 0;
    var sumLensSqrd = 0;
    var rotations = getRotations(a);

    rotations.forEach(function (r, i) {
      a.slice(1).forEach(function (s, j) {
        sumLensSqrd += distanceSquareRoot(a[(i + j) % segCount].slice(-2), b[j % segCount].slice(-2));
      });
      lineLengths[i] = sumLensSqrd;
      sumLensSqrd = 0;
    });

    computedIndex = lineLengths.indexOf(Math.min.apply(null, lineLengths));

    return rotations[computedIndex];
  }

  // Component Functions
  function getCubicMorph(/* tweenProp, value */) {
    return this.element.getAttribute('d');
  }
  function prepareCubicMorph(tweenProp, value) {
    // get path d attribute or create a path from string value
    var pathObject = {};
    // remove newlines, they break some JSON strings
    var pathReg = new RegExp('\\n', 'ig');

    var el = null;
    if (value instanceof SVGElement) {
      el = value;
    } else if (/^\.|^#/.test(value)) {
      el = selector(value);
    }

    // make sure to return pre-processed values
    if (typeof (value) === 'object' && value.curve) {
      return value;
    } if (el && /path|glyph/.test(el.tagName)) {
      pathObject.original = el.getAttribute('d').replace(pathReg, '');
    // maybe it's a string path already
    } else if (!el && typeof (value) === 'string') {
      pathObject.original = value.replace(pathReg, '');
    }
    return pathObject;
  }
  function crossCheckCubicMorph(tweenProp) {
    if (this.valuesEnd[tweenProp]) {
      var pathCurve1 = this.valuesStart[tweenProp].curve;
      var pathCurve2 = this.valuesEnd[tweenProp].curve;

      if (!pathCurve1 || !pathCurve2
        || (pathCurve1 && pathCurve2 && pathCurve1[0][0] === 'M' && pathCurve1.length !== pathCurve2.length)) {
        var path1 = this.valuesStart[tweenProp].original;
        var path2 = this.valuesEnd[tweenProp].original;
        var curves = equalizeSegments(path1, path2);
        var curve0 = getDrawDirection(curves[0]) !== getDrawDirection(curves[1])
          ? reverseCurve(curves[0])
          : clonePath(curves[0]);

        this.valuesStart[tweenProp].curve = curve0;
        this.valuesEnd[tweenProp].curve = getRotatedCurve(curves[1], curve0);
      }
    }
  }

  // All Component Functions
  var svgCubicMorphFunctions = {
    prepareStart: getCubicMorph,
    prepareProperty: prepareCubicMorph,
    onStart: onStartCubicMorph,
    crossCheck: crossCheckCubicMorph,
  };

  // Component Full
  var svgCubicMorph = {
    component: 'svgCubicMorph',
    property: 'path',
    defaultValue: [],
    Interpolate: { numbers: numbers, pathToString: pathToString },
    functions: svgCubicMorphFunctions,
    // export utils to global for faster execution
    Util: {
      pathToCurve: pathToCurve,
      pathToAbsolute: pathToAbsolute,
      pathToString: pathToString,
      parsePathString: parsePathString,
      getRotatedCurve: getRotatedCurve,
      getRotations: getRotations,
      equalizeSegments: equalizeSegments,
      reverseCurve: reverseCurve,
      clonePath: clonePath,
      getDrawDirection: getDrawDirection,
      splitCubic: splitCubic,
      getCurveArray: getCurveArray,
    },
  };

  /* svgTransform = {
    property: 'svgTransform',
    subProperties,
    defaultValue,
    Interpolate: {numbers},
    functions
  } */

  // Component Functions
  function svgTransformOnStart(tweenProp) {
    if (!KUTE[tweenProp] && this.valuesEnd[tweenProp]) {
      KUTE[tweenProp] = function (l, a, b, v) {
        var x = 0;
        var y = 0;
        var deg = Math.PI / 180;
        var scale = 'scale' in b ? numbers(a.scale, b.scale, v) : 1;
        var rotate = 'rotate' in b ? numbers(a.rotate, b.rotate, v) : 0;
        var sin = Math.sin(rotate * deg);
        var cos = Math.cos(rotate * deg);
        var skewX = 'skewX' in b ? numbers(a.skewX, b.skewX, v) : 0;
        var skewY = 'skewY' in b ? numbers(a.skewY, b.skewY, v) : 0;
        var complex = rotate || skewX || skewY || scale !== 1 || 0;

        // start normalizing the translation, we start from last to first
        // (from last chained translation)
        // the normalized translation will handle the transformOrigin tween option
        // and makes sure to have a consistent transformation

        // we start with removing transformOrigin from translation
        x -= complex ? b.origin[0] : 0; y -= complex ? b.origin[1] : 0;
        x *= scale; y *= scale; // we now apply the scale
        // now we apply skews
        y += skewY ? x * Math.tan(skewY * deg) : 0; x += skewX ? y * Math.tan(skewX * deg) : 0;
        var cxsy = cos * x - sin * y; // apply rotation as well
        y = rotate ? sin * x + cos * y : y; x = rotate ? cxsy : x;
        // now we apply the actual translation
        x += 'translate' in b ? numbers(a.translate[0], b.translate[0], v) : 0;
        y += 'translate' in b ? numbers(a.translate[1], b.translate[1], v) : 0;
        // normalizing ends with the addition of the transformOrigin to the translation
        x += complex ? b.origin[0] : 0; y += complex ? b.origin[1] : 0;

        // finally we apply the transform attribute value
        l.setAttribute('transform', (x || y ? (("translate(" + ((x * 1000 >> 0) / 1000) + (y ? (("," + ((y * 1000 >> 0) / 1000))) : '') + ")")) : '')
                                   + (rotate ? ("rotate(" + ((rotate * 1000 >> 0) / 1000) + ")") : '')
                                   + (skewX ? ("skewX(" + ((skewX * 1000 >> 0) / 1000) + ")") : '')
                                   + (skewY ? ("skewY(" + ((skewY * 1000 >> 0) / 1000) + ")") : '')
                                   + (scale !== 1 ? ("scale(" + ((scale * 1000 >> 0) / 1000) + ")") : ''));
      };
    }
  }

  /* const svgTransform = {
    property: 'svgTransform',
    subProperties,
    defaultValue,
    Interpolate: {numbers},
    functions
  } */

  // Component Util
  function parseStringOrigin(origin, ref) {
    var x = ref.x;
    var width = ref.width;

    var result;
    if (/[a-z]/i.test(origin) && !/px/.test(origin)) {
      result = origin.replace(/top|left/, 0)
        .replace(/right|bottom/, 100)
        .replace(/center|middle/, 50);
    } else {
      result = /%/.test(origin) ? (x + (parseFloat(origin) * width) / 100) : parseFloat(origin);
    }
    return result;
  }

  // helper function that turns transform value from string to object
  function parseTransformString(a) {
    var c = {};
    var d = a && /\)/.test(a)
      ? a.substring(0, a.length - 1).split(/\)\s|\)/)
      : 'none';

    if (d instanceof Array) {
      for (var j = 0, jl = d.length; j < jl; j += 1) {
        var ref = d[j].trim().split('(');
        var prop = ref[0];
        var val = ref[1];
        c[prop] = val;
      }
    }
    return c;
  }

  function parseTransformSVG(p, v) {
    var svgTransformObject = {};

    // by default the transformOrigin is "50% 50%" of the shape box
    var bb = this.element.getBBox();
    var cx = bb.x + bb.width / 2;
    var cy = bb.y + bb.height / 2;

    var origin = this._transformOrigin;
    var translation;

    if (typeof (origin) !== 'undefined') {
      origin = origin instanceof Array ? origin : origin.split(/\s/);
    } else {
      origin = [cx, cy];
    }

    origin[0] = typeof origin[0] === 'number' ? origin[0] : parseStringOrigin(origin[0], bb);
    origin[1] = typeof origin[1] === 'number' ? origin[1] : parseStringOrigin(origin[1], bb);

    svgTransformObject.origin = origin;

    // populate the valuesStart and / or valuesEnd
    Object.keys(v).forEach(function (i) {
      var assign;

      if (i === 'rotate') {
        if (typeof v[i] === 'number') {
          svgTransformObject[i] = v[i];
        } else if (v[i] instanceof Array) {
          (assign = v[i], svgTransformObject[i] = assign[0]);
        } else {
          svgTransformObject[i] = v[i].split(/\s/)[0] * 1;
        }
      } else if (i === 'translate') {
        if (v[i] instanceof Array) {
          translation = v[i];
        } else if (/,|\s/.test(v[i])) {
          translation = v[i].split(',');
        } else {
          translation = [v[i], 0];
        }
        svgTransformObject[i] = [translation[0] * 1 || 0, translation[1] * 1 || 0];
      } else if (/skew/.test(i)) {
        svgTransformObject[i] = v[i] * 1 || 0;
      } else if (i === 'scale') {
        svgTransformObject[i] = parseFloat(v[i]) || 1;
      }
    });

    return svgTransformObject;
  }

  // Component Functions
  function prepareSvgTransform(p, v) {
    return parseTransformSVG.call(this, p, v);
  }

  // returns an obect with current transform attribute value
  function getStartSvgTransform(tweenProp, value) {
    var transformObject = {};
    var currentTransform = parseTransformString(this.element.getAttribute('transform'));

    // find a value in current attribute value or add a default value
    Object.keys(value).forEach(function (j) {
      var scaleValue = j === 'scale' ? 1 : 0;
      transformObject[j] = j in currentTransform ? currentTransform[j] : scaleValue;
    });

    return transformObject;
  }

  function svgTransformCrossCheck(prop) {
    if (!this._resetStart) { return; } // fix since 1.6.1 for fromTo() method

    if (this.valuesEnd[prop]) {
      var valuesStart = this.valuesStart[prop];
      var valuesEnd = this.valuesEnd[prop];
      var currentTransform = parseTransformSVG.call(this, prop,
        parseTransformString(this.element.getAttribute('transform')));

      // populate the valuesStart first
      Object.keys(currentTransform).forEach(function (tp) {
        valuesStart[tp] = currentTransform[tp];
      });

      // now try to determine the REAL translation
      var parentSVG = this.element.ownerSVGElement;
      var startMatrix = parentSVG.createSVGTransformFromMatrix(
        parentSVG.createSVGMatrix()
          .translate(-valuesStart.origin[0], -valuesStart.origin[1]) // - origin
          .translate('translate' in valuesStart // the current translate
            ? valuesStart.translate[0] : 0, 'translate' in valuesStart ? valuesStart.translate[1]
            : 0)
          .rotate(valuesStart.rotate || 0)
          .skewX(valuesStart.skewX || 0)
          .skewY(valuesStart.skewY || 0)
          .scale(valuesStart.scale || 1)// the other functions
          .translate(+valuesStart.origin[0], +valuesStart.origin[1]) // + origin
      );
      // finally the translate we're looking for
      valuesStart.translate = [startMatrix.matrix.e, startMatrix.matrix.f];

      // copy existing and unused properties to the valuesEnd
      Object.keys(valuesStart).forEach(function (s) {
        if (!(s in valuesEnd) || s === 'origin') {
          valuesEnd[s] = valuesStart[s];
        }
      });
    }
  }

  // All Component Functions
  var svgTransformFunctions = {
    prepareStart: getStartSvgTransform,
    prepareProperty: prepareSvgTransform,
    onStart: svgTransformOnStart,
    crossCheck: svgTransformCrossCheck,
  };

  // Component Full
  var svgTransform = {
    component: 'svgTransformProperty',
    property: 'svgTransform',
    // subProperties: ['translate','rotate','skewX','skewY','scale'],
    defaultOptions: { transformOrigin: '50% 50%' },
    defaultValue: {
      translate: 0, rotate: 0, skewX: 0, skewY: 0, scale: 1,
    },
    Interpolate: { numbers: numbers },
    functions: svgTransformFunctions,

    // export utils to globals for faster execution
    Util: { parseStringOrigin: parseStringOrigin, parseTransformString: parseTransformString, parseTransformSVG: parseTransformSVG },
  };

  var addEventListener = 'addEventListener';

  var removeEventListener = 'removeEventListener';

  var supportPassive = (function () {
    var result = false;
    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function get() {
          result = true;
          return result;
        },
      });
      document[addEventListener]('DOMContentLoaded', function wrap() {
        document[removeEventListener]('DOMContentLoaded', wrap, opts);
      }, opts);
    } catch (e) {
      throw Error('Passive events are not supported');
    }

    return result;
  })();

  var mouseHoverEvents = ('onmouseleave' in document) ? ['mouseenter', 'mouseleave'] : ['mouseover', 'mouseout'];

  var supportTouch = ('ontouchstart' in window || navigator.msMaxTouchPoints) || false;

  // Component Util
  // events preventing scroll
  var touchOrWheel = supportTouch ? 'touchstart' : 'mousewheel';

  // true scroll container
  // very important and specific to the component
  var scrollContainer = navigator && /(EDGE|Mac)/i.test(navigator.userAgent)
    ? document.body
    : document.documentElement;

  // scroll event options
  // it's important to stop propagating when animating scroll
  var passiveHandler = supportPassive ? { passive: false } : false;

  // prevent mousewheel or touch events while tweening scroll
  function preventScroll(e) {
    if (this.scrolling) { e.preventDefault(); }
  }
  function getScrollTargets() {
    var el = this.element;
    return el === scrollContainer ? { el: document, st: document.body } : { el: el, st: el };
  }
  function toggleScrollEvents(action, element) {
    element[action](mouseHoverEvents[0], preventScroll, passiveHandler);
    element[action](touchOrWheel, preventScroll, passiveHandler);
  }
  function scrollIn() {
    var targets = getScrollTargets.call(this);

    if ('scroll' in this.valuesEnd && !targets.el.scrolling) {
      targets.el.scrolling = 1;
      toggleScrollEvents('addEventListener', targets.el);
      targets.st.style.pointerEvents = 'none';
    }
  }
  function scrollOut() { // prevent scroll when tweening scroll
    var targets = getScrollTargets.call(this);

    if ('scroll' in this.valuesEnd && targets.el.scrolling) {
      targets.el.scrolling = 0;
      toggleScrollEvents('removeEventListener', targets.el);
      targets.st.style.pointerEvents = '';
    }
  }

  // Component Functions
  function onStartScroll(tweenProp) {
    // checking 0 will NOT add the render function
    if (tweenProp in this.valuesEnd && !KUTE[tweenProp]) {
      this.element = ('scroll' in this.valuesEnd) && (!this.element || this.element === window)
        ? scrollContainer : this.element;
      scrollIn.call(this);
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.scrollTop = (numbers(a, b, v)) >> 0;
      };
    }
  }
  function onCompleteScroll(/* tweenProp */) {
    scrollOut.call(this);
  }

  // Component Functions
  function getScroll() {
    this.element = ('scroll' in this.valuesEnd) && (!this.element || this.element === window)
      ? scrollContainer : this.element;

    return this.element === scrollContainer
      ? (window.pageYOffset || scrollContainer.scrollTop)
      : this.element.scrollTop;
  }

  function prepareScroll(prop, value) {
    return parseInt(value, 10);
  }

  // All Component Functions
  var scrollFunctions = {
    prepareStart: getScroll,
    prepareProperty: prepareScroll,
    onStart: onStartScroll,
    onComplete: onCompleteScroll,
  };

  // Full Component
  var scrollProperty = {
    component: 'scrollProperty',
    property: 'scroll',
    defaultValue: 0,
    Interpolate: { numbers: numbers },
    functions: scrollFunctions,
    // export stuff to global
    Util: {
      preventScroll: preventScroll, scrollIn: scrollIn, scrollOut: scrollOut, getScrollTargets: getScrollTargets, toggleScrollEvents: toggleScrollEvents, supportPassive: supportPassive,
    },
  };

  // Component Properties
  var shadowProps$1 = ['boxShadow', 'textShadow'];

  // Component Functions
  function onStartShadow(tweenProp) {
    if (this.valuesEnd[tweenProp] && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        // let's start with the numbers | set unit | also determine inset
        var params = [];
        var unit = 'px';
        var sl = tweenProp === 'textShadow' ? 3 : 4;
        var colA = sl === 3 ? a[3] : a[4];
        var colB = sl === 3 ? b[3] : b[4];
        var inset = (a[5] && a[5] !== 'none') || (b[5] && b[5] !== 'none') ? ' inset' : false;

        for (var i = 0; i < sl; i += 1) {
          params.push(((numbers(a[i], b[i], v) * 1000 >> 0) / 1000) + unit);
        }
        // the final piece of the puzzle, the DOM update
        elem.style[tweenProp] = inset
          ? colors(colA, colB, v) + params.join(' ') + inset
          : colors(colA, colB, v) + params.join(' ');
      };
    }
  }
  var shadowPropOnStart$1 = {};
  shadowProps$1.forEach(function (x) { shadowPropOnStart$1[x] = onStartShadow; });

  // Component Properties
  var shadowProps = ['boxShadow', 'textShadow'];

  // Component Util

  // box-shadow: none | h-shadow v-shadow blur spread color inset|initial|inherit
  // text-shadow: none | offset-x offset-y blur-radius color |initial|inherit
  // utility function to process values accordingly
  // numbers must be floats and color must be rgb object
  function processShadowArray(shadow, tweenProp) {
    var newShadow;

    // [h-shadow, v-shadow, color]
    if (shadow.length === 3) {
      newShadow = [shadow[0], shadow[1], 0, 0, shadow[2], 'none'];
    // [h-shadow, v-shadow, color, inset] | [h-shadow, v-shadow, blur, color]
    } else if (shadow.length === 4) {
      newShadow = /inset|none/.test(shadow[3])
        ? [shadow[0], shadow[1], 0, 0, shadow[2], shadow[3]]
        : [shadow[0], shadow[1], shadow[2], 0, shadow[3], 'none'];
    // [h-shadow, v-shadow, blur, color, inset] | [h-shadow, v-shadow, blur, spread, color]
    } else if (shadow.length === 5) {
      newShadow = /inset|none/.test(shadow[4])
        ? [shadow[0], shadow[1], shadow[2], 0, shadow[3], shadow[4]]
        : [shadow[0], shadow[1], shadow[2], shadow[3], shadow[4], 'none'];
    // ideal [h-shadow, v-shadow, blur, spread, color, inset]
    } else if (shadow.length === 6) {
      newShadow = shadow;
    }

    // make sure the values are ready to tween
    for (var i = 0; i < 4; i += 1) {
      newShadow[i] = parseFloat(newShadow[i]);
    }

    // also the color must be a rgb object
    newShadow[4] = trueColor(newShadow[4]);

    newShadow = tweenProp === 'boxShadow'
      ? newShadow
      : newShadow.filter(function (x, i) { return [0, 1, 2, 4].includes(i); });

    return newShadow;
  }

  // Component Functions
  function getShadow(tweenProp/* , value */) {
    var cssShadow = getStyleForProperty(this.element, tweenProp);
    // '0px 0px 0px 0px rgb(0,0,0)'
    return /^none$|^initial$|^inherit$|^inset$/.test(cssShadow)
      ? defaultValues[tweenProp]
      : cssShadow;
  }

  function prepareShadow(tweenProp, propValue) {
    // [horizontal, vertical, blur, spread, color: {r:0,g:0,b:0}, inset]
    // parseProperty for boxShadow, builds basic structure with ready to tween values
    var value = propValue;
    if (typeof value === 'string') {
      var inset = 'none';
      // a full RegEx for color strings
      var colRegEx = /(\s?(?:#(?:[\da-f]{3}){1,2}|rgba?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\))\s?)/gi;
      var currentColor = value.match(colRegEx);

      // make sure to always have the inset last if possible
      inset = /inset/.test(value) ? 'inset' : inset;
      value = /inset/.test(value) ? value.replace(/(\s+inset|inset+\s)/g, '') : value;

      // also getComputedStyle often returns color first "rgb(0, 0, 0) 15px 15px 6px 0px inset"
      value = value.replace(currentColor[0], '').split(' ').concat([currentColor[0].replace(/\s/g, '')], [inset]);

      value = processShadowArray(value, tweenProp);
    } else if (value instanceof Array) {
      value = processShadowArray(value, tweenProp);
    }

    return value;
  }

  var shadowPropOnStart = {};
  shadowProps.forEach(function (x) { shadowPropOnStart[x] = onStartShadow; });

  // All Component Functions
  var shadowFunctions = {
    prepareStart: getShadow,
    prepareProperty: prepareShadow,
    onStart: shadowPropOnStart,
  };

  // Component Full
  var shadowProperties = {
    component: 'shadowProperties',
    properties: shadowProps,
    defaultValues: {
      boxShadow: '0px 0px 0px 0px rgb(0,0,0)',
      textShadow: '0px 0px 0px rgb(0,0,0)',
    },
    Interpolate: { numbers: numbers, colors: colors },
    functions: shadowFunctions,
    Util: { processShadowArray: processShadowArray, trueColor: trueColor },
  };

  /* textProperties = {
    category: 'textProperties',
    defaultValues: [],
    interpolators: {units},
    functions = { prepareStart, prepareProperty, onStart:{}
  } */

  // Component Properties
  var textProperties$1 = ['fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing'];
  var textOnStart$1 = {};

  function textPropOnStart(tweenProp) {
    if (this.valuesEnd[tweenProp] && !KUTE[tweenProp]) {
      KUTE[tweenProp] = function (elem, a, b, v) {
        elem.style[tweenProp] = units(a.v, b.v, b.u, v);
      };
    }
  }

  textProperties$1.forEach(function (tweenProp) {
    textOnStart$1[tweenProp] = textPropOnStart;
  });

  /* textProperties = {
    category: 'textProperties',
    defaultValues: [],
    interpolators: {units}
    functions = { prepareStart, prepareProperty, onStart }
  } */

  // Component Properties
  var textProps = ['fontSize', 'lineHeight', 'letterSpacing', 'wordSpacing'];
  var textOnStart = {};

  // Component Functions
  textProps.forEach(function (tweenProp) {
    textOnStart[tweenProp] = textPropOnStart;
  });

  function getTextProp(prop/* , value */) {
    return getStyleForProperty(this.element, prop) || defaultValues[prop];
  }

  function prepareTextProp(prop, value) {
    return trueDimension(value);
  }

  // All Component Functions
  var textPropFunctions = {
    prepareStart: getTextProp,
    prepareProperty: prepareTextProp,
    onStart: textOnStart,
  };

  // Component Full
  var textProperties = {
    component: 'textProperties',
    category: 'textProperties',
    properties: textProps,
    defaultValues: {
      fontSize: 0, lineHeight: 0, letterSpacing: 0, wordSpacing: 0,
    },
    Interpolate: { units: units },
    functions: textPropFunctions,
    Util: { trueDimension: trueDimension },
  };

  // Component Values
  var lowerCaseAlpha = String('abcdefghijklmnopqrstuvwxyz').split(''); // lowercase
  var upperCaseAlpha = String('abcdefghijklmnopqrstuvwxyz').toUpperCase().split(''); // uppercase
  var nonAlpha = String("~!@#$%^&*()_+{}[];'<>,./?=-").split(''); // symbols
  var numeric = String('0123456789').split(''); // numeric
  var alphaNumeric = lowerCaseAlpha.concat(upperCaseAlpha, numeric); // alpha numeric
  var allTypes = alphaNumeric.concat(nonAlpha); // all caracters

  var charSet = {
    alpha: lowerCaseAlpha, // lowercase
    upper: upperCaseAlpha, // uppercase
    symbols: nonAlpha, // symbols
    numeric: numeric,
    alphanumeric: alphaNumeric,
    all: allTypes,
  };

  // Component Functions
  var onStartWrite = {
    text: function text(tweenProp) {
      if (!KUTE[tweenProp] && this.valuesEnd[tweenProp]) {
        var chars = this._textChars;
        var charsets = charSet[defaultOptions.textChars];

        if (chars in charSet) {
          charsets = charSet[chars];
        } else if (chars && chars.length) {
          charsets = chars;
        }

        KUTE[tweenProp] = function (elem, a, b, v) {
          var initialText = '';
          var endText = '';
          var finalText = b === '' ? ' ' : b;
          var firstLetterA = a.substring(0);
          var firstLetterB = b.substring(0);
          var pointer = charsets[(Math.random() * charsets.length) >> 0];

          if (a === ' ') {
            endText = firstLetterB
              .substring(Math.min(v * firstLetterB.length, firstLetterB.length) >> 0, 0);
            elem.innerHTML = v < 1 ? ((endText + pointer)) : finalText;
          } else if (b === ' ') {
            initialText = firstLetterA
              .substring(0, Math.min((1 - v) * firstLetterA.length, firstLetterA.length) >> 0);
            elem.innerHTML = v < 1 ? ((initialText + pointer)) : finalText;
          } else {
            initialText = firstLetterA
              .substring(firstLetterA.length,
                Math.min(v * firstLetterA.length, firstLetterA.length) >> 0);
            endText = firstLetterB
              .substring(0, Math.min(v * firstLetterB.length, firstLetterB.length) >> 0);
            elem.innerHTML = v < 1 ? ((endText + pointer + initialText)) : finalText;
          }
        };
      }
    },
    number: function number(tweenProp) {
      if (tweenProp in this.valuesEnd && !KUTE[tweenProp]) { // numbers can be 0
        KUTE[tweenProp] = function (elem, a, b, v) {
          elem.innerHTML = numbers(a, b, v) >> 0;
        };
      }
    },
  };

  // Component Util
  // utility for multi-child targets
  // wrapContentsSpan returns an [Element] with the SPAN.tagName and a desired class
  function wrapContentsSpan(el, classNAME) {
    var assign;

    var textWriteWrapper;
    var newElem;
    if (typeof (el) === 'string') {
      newElem = document.createElement('SPAN');
      newElem.innerHTML = el;
      newElem.className = classNAME;
      return newElem;
    }
    if (!el.children.length || (el.children.length && el.children[0].className !== classNAME)) {
      var elementInnerHTML = el.innerHTML;
      textWriteWrapper = document.createElement('SPAN');
      textWriteWrapper.className = classNAME;
      textWriteWrapper.innerHTML = elementInnerHTML;
      el.appendChild(textWriteWrapper);
      el.innerHTML = textWriteWrapper.outerHTML;
    } else if (el.children.length && el.children[0].className === classNAME) {
      (assign = el.children, textWriteWrapper = assign[0]);
    }
    return textWriteWrapper;
  }

  function getTextPartsArray(el, classNAME) {
    var elementsArray = [];
    var len = el.children.length;
    if (len) {
      var textParts = [];
      var remainingMarkup = el.innerHTML;
      var wrapperParts;

      for (var i = 0, currentChild = (void 0), childOuter = (void 0), unTaggedContent = (void 0); i < len; i += 1) {
        currentChild = el.children[i];
        childOuter = currentChild.outerHTML;
        wrapperParts = remainingMarkup.split(childOuter);

        if (wrapperParts[0] !== '') {
          unTaggedContent = wrapContentsSpan(wrapperParts[0], classNAME);
          textParts.push(unTaggedContent);
          remainingMarkup = remainingMarkup.replace(wrapperParts[0], '');
        } else if (wrapperParts[1] !== '') {
          unTaggedContent = wrapContentsSpan(wrapperParts[1].split('<')[0], classNAME);
          textParts.push(unTaggedContent);
          remainingMarkup = remainingMarkup.replace(wrapperParts[0].split('<')[0], '');
        }

        if (!currentChild.classList.contains(classNAME)) { currentChild.classList.add(classNAME); }
        textParts.push(currentChild);
        remainingMarkup = remainingMarkup.replace(childOuter, '');
      }

      if (remainingMarkup !== '') {
        var unTaggedRemaining = wrapContentsSpan(remainingMarkup, classNAME);
        textParts.push(unTaggedRemaining);
      }

      elementsArray = elementsArray.concat(textParts);
    } else {
      elementsArray = elementsArray.concat([wrapContentsSpan(el, classNAME)]);
    }
    return elementsArray;
  }

  function setSegments(target, newText) {
    var oldTargetSegs = getTextPartsArray(target, 'text-part');
    var newTargetSegs = getTextPartsArray(wrapContentsSpan(newText), 'text-part');

    target.innerHTML = '';
    target.innerHTML += oldTargetSegs.map(function (s) { s.className += ' oldText'; return s.outerHTML; }).join('');
    target.innerHTML += newTargetSegs.map(function (s) { s.className += ' newText'; return s.outerHTML.replace(s.innerHTML, ''); }).join('');

    return [oldTargetSegs, newTargetSegs];
  }

  function createTextTweens(target, newText, ops) {
    if (target.playing) { return false; }

    var options = ops || {};
    options.duration = 1000;

    if (ops.duration === 'auto') {
      options.duration = 'auto';
    } else if (Number.isFinite(ops.duration * 1)) {
      options.duration = ops.duration * 1;
    }

    var TweenContructor = connect.tween;
    var segs = setSegments(target, newText);
    var oldTargetSegs = segs[0];
    var newTargetSegs = segs[1];
    var oldTargets = [].slice.call(target.getElementsByClassName('oldText')).reverse();
    var newTargets = [].slice.call(target.getElementsByClassName('newText'));

    var textTween = [];
    var totalDelay = 0;

    textTween = textTween.concat(oldTargets.map(function (el, i) {
      options.duration = options.duration === 'auto'
        ? oldTargetSegs[i].innerHTML.length * 75
        : options.duration;
      options.delay = totalDelay;
      options.onComplete = null;

      totalDelay += options.duration;
      return new TweenContructor(el, { text: el.innerHTML }, { text: '' }, options);
    }));
    textTween = textTween.concat(newTargets.map(function (el, i) {
      function onComplete() {
        target.innerHTML = newText;
        target.playing = false;
      }

      options.duration = options.duration === 'auto' ? newTargetSegs[i].innerHTML.length * 75 : options.duration;
      options.delay = totalDelay;
      options.onComplete = i === newTargetSegs.length - 1 ? onComplete : null;
      totalDelay += options.duration;

      return new TweenContructor(el, { text: '' }, { text: newTargetSegs[i].innerHTML }, options);
    }));

    textTween.start = function startTweens() {
      if (!target.playing) {
        textTween.forEach(function (tw) { return tw.start(); });
        target.playing = true;
      }
    };

    return textTween;
  }

  // Component Functions
  function getWrite(/* tweenProp, value */) {
    return this.element.innerHTML;
  }

  function prepareText(tweenProp, value) {
    if (tweenProp === 'number') {
      return parseFloat(value);
    }
    // empty strings crash the update function
    return value === '' ? ' ' : value;
  }

  // All Component Functions
  var textWriteFunctions = {
    prepareStart: getWrite,
    prepareProperty: prepareText,
    onStart: onStartWrite,
  };

  // Full Component
  var textWrite = {
    component: 'textWriteProperties',
    category: 'textWrite',
    properties: ['text', 'number'],
    defaultValues: { text: ' ', number: '0' },
    defaultOptions: { textChars: 'alpha' },
    Interpolate: { numbers: numbers },
    functions: textWriteFunctions,
    // export to global for faster execution
    Util: { charSet: charSet, createTextTweens: createTextTweens },
  };

  function arrays(a, b, v) {
    var result = [];
    for (var i = 0, l = b.length; i < l; i += 1) {
      result[i] = ((a[i] + (b[i] - a[i]) * v) * 1000 >> 0) / 1000;
    }
    return result;
  }

  // Component special
  // this component is restricted to modern browsers only
  var CSS3Matrix = typeof (DOMMatrix) !== 'undefined' ? DOMMatrix : null;

  // Component Functions
  var onStartTransform = {
    transform: function transform(tweenProp) {
      if (CSS3Matrix && this.valuesEnd[tweenProp] && !KUTE[tweenProp]) {
        KUTE[tweenProp] = function (elem, a, b, v) {
          var matrix = new CSS3Matrix();
          var tObject = {};

          Object.keys(b).forEach(function (p) {
            tObject[p] = p === 'perspective' ? numbers(a[p], b[p], v) : arrays(a[p], b[p], v);
          });

          // set perspective
          if (tObject.perspective) { matrix.m34 = -1 / tObject.perspective; }

          // set translate
          matrix = tObject.translate3d
            ? matrix.translate(tObject.translate3d[0], tObject.translate3d[1], tObject.translate3d[2])
            : matrix;

          // set rotation
          matrix = tObject.rotate3d
            ? matrix.rotate(tObject.rotate3d[0], tObject.rotate3d[1], tObject.rotate3d[2])
            : matrix;

          // set skew
          if (tObject.skew) {
            matrix = tObject.skew[0] ? matrix.skewX(tObject.skew[0]) : matrix;
            matrix = tObject.skew[1] ? matrix.skewY(tObject.skew[1]) : matrix;
          }

          // set scale
          matrix = tObject.scale3d
            ? matrix.scale(tObject.scale3d[0], tObject.scale3d[1], tObject.scale3d[2])
            : matrix;

          // set element style
          elem.style[tweenProp] = matrix.toString();
        };
      }
    },
    CSS3Matrix: function CSS3Matrix$1(prop) {
      if (CSS3Matrix && this.valuesEnd.transform) {
        if (!KUTE[prop]) { KUTE[prop] = CSS3Matrix; }
      }
    },
  };

  /* transformMatrix = {
    property : 'transform',
    defaultValue: {},
    interpolators: {}
    functions = { prepareStart, prepareProperty, onStart, crossCheck }
  } */

  // Component name
  var matrixComponent = 'transformMatrix';

  // Component Functions
  function getTransform(tweenProp, value) {
    var transformObject = {};
    var currentValue = this.element[matrixComponent];

    if (currentValue) {
      Object.keys(currentValue).forEach(function (vS) {
        transformObject[vS] = currentValue[vS];
      });
    } else {
      Object.keys(value).forEach(function (vE) {
        transformObject[vE] = vE === 'perspective' ? value[vE] : defaultValues.transform[vE];
      });
    }
    return transformObject;
  }

  function prepareTransform(tweenProp, value) {
    if (typeof (value) === 'object' && !value.length) {
      var pv;
      var transformObject = {};
      var translate3dObj = {};
      var rotate3dObj = {};
      var scale3dObj = {};
      var skewObj = {};
      var axis = [{ translate3d: translate3dObj },
        { rotate3d: rotate3dObj },
        { skew: skewObj },
        { scale3d: scale3dObj }];

      Object.keys(value).forEach(function (prop) {
        if (/3d/.test(prop) && typeof (value[prop]) === 'object' && value[prop].length) {
          pv = value[prop].map(function (v) { return (prop === 'scale3d' ? parseFloat(v) : parseInt(v, 10)); });
          transformObject[prop] = prop === 'scale3d' ? [pv[0] || 1, pv[1] || 1, pv[2] || 1] : [pv[0] || 0, pv[1] || 0, pv[2] || 0];
        } else if (/[XYZ]/.test(prop)) {
          var obj = {};
          if (/translate/.test(prop)) {
            obj = translate3dObj;
          } else if (/rotate/.test(prop)) {
            obj = rotate3dObj;
          } else if (/scale/.test(prop)) {
            obj = scale3dObj;
          } else if (/skew/.test(prop)) {
            obj = skewObj;
          }
          var idx = prop.replace(/translate|rotate|scale|skew/, '').toLowerCase();
          obj[idx] = /scale/.test(prop) ? parseFloat(value[prop]) : parseInt(value[prop], 10);
        } else if (prop === 'skew') {
          pv = value[prop].map(function (v) { return parseInt(v, 10) || 0; });
          transformObject[prop] = [pv[0] || 0, pv[1] || 0];
        } else { // perspective
          transformObject[prop] = parseInt(value[prop], 10);
        }
      });

      axis.forEach(function (o) {
        var tp = Object.keys(o)[0];
        var tv = o[tp];
        if (Object.keys(tv).length && !transformObject[tp]) {
          if (tp === 'scale3d') {
            transformObject[tp] = [tv.x || 1, tv.y || 1, tv.z || 1];
          } else if (tp === 'skew') {
            transformObject[tp] = [tv.x || 0, tv.y || 0];
          } else { // translate | rotate
            transformObject[tp] = [tv.x || 0, tv.y || 0, tv.z || 0];
          }
        }
      });
      return transformObject;
    } // string | array
    // if ( typeof (value) === 'object' && value.length ) {
    // } else if ( typeof (value) === string && value.includes('matrix')) {
    // decompose matrix to object
    throw Error(("KUTE.js - \"" + value + "\" is not valid/supported transform function"));
  }

  function onCompleteTransform(tweenProp) {
    var this$1$1 = this;

    if (this.valuesEnd[tweenProp]) {
      this.element[matrixComponent] = {};
      Object.keys(this.valuesEnd[tweenProp]).forEach(function (tf) {
        this$1$1.element[matrixComponent][tf] = this$1$1.valuesEnd[tweenProp][tf];
      });
    }
  }
  function crossCheckTransform(tweenProp) {
    if (this.valuesEnd[tweenProp]) {
      if (this.valuesEnd[tweenProp].perspective && !this.valuesStart[tweenProp].perspective) {
        this.valuesStart[tweenProp].perspective = this.valuesEnd[tweenProp].perspective;
      }
    }
  }

  // All Component Functions
  var matrixFunctions = {
    prepareStart: getTransform,
    prepareProperty: prepareTransform,
    onStart: onStartTransform,
    onComplete: onCompleteTransform,
    crossCheck: crossCheckTransform,
  };

  // Component Full Object
  var matrixTransform = {
    component: matrixComponent,
    property: 'transform',
    /* subProperties: [
      'perspective', 'translate3d', 'translateX', 'translateY', 'translateZ',
      'rotate3d', 'rotateX', 'rotateY', 'rotateZ',
      'skew','skewX','skewY',
      'scale3d', 'scaleX', 'scaleY', 'scaleZ'], */
    defaultValue: {
      perspective: 400,
      translate3d: [0, 0, 0],
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate3d: [0, 0, 0],
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      skew: [0, 0],
      skewX: 0,
      skewY: 0,
      scale3d: [1, 1, 1],
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
    },
    functions: matrixFunctions,
    Interpolate: {
      perspective: numbers,
      translate3d: arrays,
      rotate3d: arrays,
      skew: arrays,
      scale3d: arrays,
    },
  };

  var Components = {
    BackgroundPosition: BackgroundPosition,
    BorderRadius: BorderRadius,
    BoxModel: boxModel,
    ClipProperty: clipProperty,
    ColorProperties: colorProperties,
    FilterEffects: filterEffects,
    HTMLAttributes: htmlAttributes,
    OpacityProperty: opacityProperty,
    SVGDraw: svgDraw,
    SVGCubicMorph: svgCubicMorph,
    SVGTransform: svgTransform,
    ScrollProperty: scrollProperty,
    ShadowProperties: shadowProperties,
    TextProperties: textProperties,
    TextWriteProperties: textWrite,
    MatrixTransform: matrixTransform,
  };

  // init components
  Object.keys(Components).forEach(function (component) {
    var compOps = Components[component];
    Components[component] = new AnimationDevelopment(compOps);
  });

  var version = "2.1.3";

  var indexExtra = {
    Animation: AnimationDevelopment,
    Components: Components,

    // Tween Interface
    Tween: TweenExtra,
    fromTo: fromTo,
    to: to,
    // Tween Collection
    TweenCollection: TweenCollection,
    ProgressBar: ProgressBar,
    allFromTo: allFromTo,
    allTo: allTo,
    // Tween Interface

    Objects: Objects,
    Util: Util,
    Easing: Easing,
    CubicBezier: CubicBezier,
    Render: Render,
    Interpolate: Interpolate,
    Process: Process,
    Internals: Internals,
    Selector: selector,
    Version: version,
  };

  return indexExtra;

}));
