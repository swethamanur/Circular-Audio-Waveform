var AUDIO = AUDIO || {};
var context;
var audioInput = document.getElementById('audioInput');

AUDIO.VISUALIZER = (function () {
    'use strict';

    var INTERVAL = null;
    var FFT_SIZE = 512;
    var TYPE = {
            'lounge': 'renderLounge'
        };

    /**
     * @description
     * Visualizer constructor.
     *
     * @param {Object} cfg
     */

    function Visualizer (cfg) {
        this.isPlaying = false;
        this.autoplay = cfg.autoplay || false;
        this.loop = cfg.loop || false;
        this.audio = document.getElementById(cfg.audio) || {};
        console.log(this.audio)
        this.canvas = document.getElementById(cfg.canvas) || {};
        console.log(this.canvas)
        this.canvasCtx = this.canvas.getContext('2d') || null;
        this.author = this.audio.getAttribute('data-author') || '';
        this.title = this.audio.getAttribute('data-title') || '';
        this.ctx = null;
        this.analyser = null;
        this.sourceNode = null;
        this.frequencyData = [];
        this.audioSrc = null;
        this.minutes = '00';
        this.seconds = '00';
        this.style = cfg.style || 'lounge';
        this.barWidth = cfg.barWidth || 2;
        this.barHeight = cfg.barHeight || 2;
        this.barSpacing = cfg.barSpacing || 5;
        this.barColor = cfg.barColor || '#ffffff';
        this.shadowBlur = cfg.shadowBlur || 10;
        this.shadowColor = cfg.shadowColor || '#ffffff';
        this.font = cfg.font || ['12px', 'Helvetica'];
        this.gradient = null;
    }

    /**
     * @description
     * Set current audio context.
     *
     * @return {Object}
     */
    Visualizer.prototype.setContext = function () {
        
        try {
            
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            console.log(this.ctx,'before');
            console.log(AudioContext);
            
            this.ctx = new window.AudioContext();
            console.log(this.ctx,'after')
             context = this.ctx;
            if(typeof AudioContext != "undefined" || typeof webkitAudioContext != "undefined") {
                var resumeAudio = function() {
                //    if(typeof g_WebAudioContext == "undefined" || g_WebAudioContext == null) return;
                   
                   document.removeEventListener("click", resumeAudio);
                };
                document.addEventListener("click", resumeAudio);
             }
             document.getElementById('button').addEventListener('click', function() {
                 console.log(context,'inside button handler')
                context.resume().then(() => {
                  console.log('Playback resumed successfully');
                });
              });
              document.getElementById('capture').addEventListener('click',function(){
                  context.suspend().then(()=>{
                      console.log('playback paused')
                  })
              })
            return this;
        } catch (e) {
            console.info('Web Audio API is not supported.', e);
        }
    };

    /**
     * @description
     * Set buffer analyser.
     *
     * @return {Object}
     */
    Visualizer.prototype.setAnalyser = function () {
        this.analyser = context.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.6;
        this.analyser.fftSize = FFT_SIZE;
        console.log(this.analyser);
        return this;
    };

    /**
     * @description
     * Set frequency data.
     *
     * @return {Object}
     */
    Visualizer.prototype.setFrequencyData = function () {
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        return this;
    };

    /**
     * @description
     * Set source buffer and connect processor and analyser.
     *
     * @return {Object}
     */
    Visualizer.prototype.setBufferSourceNode = function () {
        console.log(context)
        this.sourceNode = context.createBufferSource();
        this.sourceNode.loop = this.loop;
        this.sourceNode.connect(this.analyser);
        this.sourceNode.connect( context.destination);

        this.sourceNode.onended = function () {
            clearInterval(INTERVAL);
            this.sourceNode.disconnect();
            this.resetTimer();
            this.isPlaying = false;
            this.sourceNode =  context.createBufferSource();
        }.bind(this);

        return this;
    };

    /**
     * @description
     * Set current media source url.
     *
     * @return {Object}
     */
    Visualizer.prototype.setMediaSource = function () {
        let audio = this.audio;
        audioInput.onchange = function() {
            var files = this.files;
            console.log(files);
            audio.src = URL.createObjectURL(files[0]);
            console.log(audio.src);
            audio.crossOrigin = "anonymous";
            console.log(audio.crossOrigin);
            audio.load();
            // audio.play();
            
          };
        

        
        // this.audioSrc = audio.src;
        this.audioSrc ='http://ia902606.us.archive.org/35/items/shortpoetry_047_librivox/song_cjrg_teasdale_64kb.mp3';
        
        return this;
    };

    /**
     * @description
     * Set canvas gradient color.
     *
     * @return {Object}
     */
    Visualizer.prototype.setCanvasStyles = function () {
        this.gradient = this.canvasCtx.createLinearGradient(0, 0, 0, 300);
        this.gradient.addColorStop(1, this.barColor);
        this.canvasCtx.fillStyle = this.gradient;
        this.canvasCtx.shadowBlur = this.shadowBlur;
        this.canvasCtx.shadowColor = this.shadowColor;
        this.canvasCtx.font = this.font.join(' ');
        this.canvasCtx.textAlign = 'center';
        return this;
    };

    /**
     * @description
     * Bind click events.
     *
     * @return {Object}
     */
    Visualizer.prototype.bindEvents = function () {
        var _this = this;

        document.addEventListener('click', function (e) {
            if (e.target === _this.canvas) {
                e.stopPropagation();
                if (!_this.isPlaying) {
                    return (context.state === 'suspended') ? _this.playSound() : _this.loadSound();
                } else {
                    return _this.pauseSound();
                }
            }
        });

        if (_this.autoplay) {
            _this.loadSound();
        }

        return this;
    };

    /**
     * @description
     * Load sound file.
     */
    Visualizer.prototype.loadSound = function () {
        var req = new XMLHttpRequest();
        req.open('GET', this.audioSrc, true);
        req.responseType = 'arraybuffer';
        
        this.canvasCtx.fillText('Loading...', this.canvas.width / 2 + 10, this.canvas.height / 2);
        console.log('here loading')

        req.onload = function () {
            console.log('onload')
            context.decodeAudioData(req.response, this.playSound.bind(this), this.onError.bind(this));
            console.log(req.response);
        }.bind(this);

        req.send();
    };

    /**
     * @description
     * Play sound from the given buffer.
     *
     * @param  {Object} buffer
     */
    Visualizer.prototype.playSound = function (buffer) {
        this.isPlaying = true;
        console.log('playsound success')
        if ( context.state === 'suspended') {
            
             context.resume().then(() => {
                console.log('Playback resumed successfully');
                console.log(context);
              });
        }
        
        this.sourceNode.buffer = buffer;
        this.sourceNode.start(0);
        this.resetTimer();
        this.startTimer();
        this.renderFrame();
    };

    /**
     * @description
     * Pause current sound.
     */
    Visualizer.prototype.pauseSound = function () {
        context.suspend();
        this.isPlaying = false;
    };

    /**
     * @description
     * Start playing timer.
     */
    Visualizer.prototype.startTimer = function () {
        console.log('start timer')
        var _this = this;

        INTERVAL = setInterval(function () {
            if (_this.isPlaying) {
                var now = new Date(_this.duration);
                var min = now.getHours();
                var sec = now.getMinutes();
                _this.minutes = (min < 10) ? '0' + min : min;
                _this.seconds = (sec < 10) ? '0' + sec : sec;
                _this.duration = now.setMinutes(sec + 1);
            }
        }, 1000);
    };

    

    /**
     * @description
     * Reset time counter.
     */
    Visualizer.prototype.resetTimer = function () {
        console.log('reset timer')
        var time =  new Date(0, 0);
        this.duration = time.getTime();
    };

    /**
     * @description
     * On audio data stream error fn.
     *
     * @param  {Object} e
     */
    Visualizer.prototype.onError = function (e) {
        console.info('Error decoding audio file. -- ', e);
    };

    /**
     * @description
     * Render frame on canvas.
     */
    Visualizer.prototype.renderFrame = function () {
        console.log('renderframe')
        requestAnimationFrame(this.renderFrame.bind(this));
        this.analyser.getByteFrequencyData(this.frequencyData);

        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderTime();
        this.renderText();
        this.renderByStyleType();
        this.renderLounge();
    };

    /**
     * @description
     * Render audio author and title.
     */
    Visualizer.prototype.renderText = function () {
        console.log('rendertext');
        var cx = this.canvas.width / 2;
        var cy = this.canvas.height / 2;
        var correction = 10;

        this.canvasCtx.textBaseline = 'top';
        this.canvasCtx.fillText('by ' + this.author, cx + correction, cy);
        this.canvasCtx.font = parseInt(this.font[0], 10) + 8 + 'px ' + this.font[1];
        this.canvasCtx.textBaseline = 'bottom';
        this.canvasCtx.fillText(this.title, cx + correction, cy);
        this.canvasCtx.font = this.font.join(' ');
    };

    /**
     * @description
     * Render audio time.
     */
    Visualizer.prototype.renderTime = function () {
        var time = this.minutes + ':' + this.seconds;
        this.canvasCtx.fillText(time, this.canvas.width / 2 + 10, this.canvas.height / 2 + 40);
    };

    /**
     * @description
     * Render frame by style type.
     *
     * @return {Function}
     */
    Visualizer.prototype.renderByStyleType = function () {
        return this[TYPE[this.style]]();
    };

    /**
     * @description
     * Render lounge style type.
     */
    Visualizer.prototype.renderLounge = function () {
        console.log('enter render lounge')
        var cx = this.canvas.width / 2;
        var cy = this.canvas.height / 2;
        var radius = 140;
        var maxBarNum = Math.floor((radius * 2 * Math.PI) / (this.barWidth + this.barSpacing));
        var slicedPercent = Math.floor((maxBarNum * 25) / 100);
        var barNum = maxBarNum - slicedPercent;
        var freqJump = Math.floor(this.frequencyData.length / maxBarNum);

        for (var i = 0; i < barNum; i++) {
            var amplitude = this.frequencyData[i * freqJump];
            var alfa = (i * 2 * Math.PI ) / maxBarNum;
            var beta = (3 * 45 - this.barWidth) * Math.PI / 180;
            var x = 0;
            var y = radius - (amplitude / 12 - this.barHeight);
            var w = this.barWidth;
            var h = amplitude / 6 + this.barHeight;

            this.canvasCtx.save();
            this.canvasCtx.translate(cx + this.barSpacing, cy + this.barSpacing);
            this.canvasCtx.rotate(alfa - beta);
            this.canvasCtx.fillRect(x, y, w, h);
            this.canvasCtx.restore();
        }
    };

    /**
     * @description
     * Create visualizer object instance.
     *
     * @param  {Object} cfg
     * {
     *     autoplay: <Bool>,
     *     loop: <Bool>,
     *     audio: <String>,
     *     canvas: <String>,
     *     style: <String>,
     *     barWidth: <Integer>,
     *     barHeight: <Integer>,
     *     barSpacing: <Integer>,
     *     barColor: <String>,
     *     shadowBlur: <Integer>,
     *     shadowColor: <String>,
     *     font: <Array>
     * }
     * @return {Function}
     * @private
     */
    function _createVisualizer (cfg) {
        var visualizer = new Visualizer(cfg);
        console.log(visualizer.setContext());

        return function () {
            visualizer
                .setContext()
                .setAnalyser()
                .setFrequencyData()
                .setBufferSourceNode()
                .setMediaSource()
                .setCanvasStyles()
                .bindEvents();

            return visualizer;
        };
    }

    /**
     * @description
     * Get visualizer instance.
     *
     * @param  {Object} cfg
     * @return {Object}
     * @public
     */
    function getInstance (cfg) {
        return _createVisualizer(cfg)();
    }

    /**
     * @description
     * Visualizer module API.
     *
     * @public
     */
    return {
        getInstance: getInstance
    };
})();

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    AUDIO.VISUALIZER.getInstance({
        autoplay: true,
        loop: true,
        audio: 'myAudio',
        canvas: 'myCanvas',
        style: 'lounge',
        barWidth: 8,
        barHeight: 20,
        barSpacing: 7,
        barColor: 'red',
        shadowBlur: 20,
        shadowColor: '#ffffff',
        font: ['12px', 'Helvetica']
    });
    console.log('hello');
}, false);

