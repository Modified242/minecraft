/**
 * Procedural Audio Synthesizer using Web Audio API
 * Generates tactile Minecraft-style sound effects (footsteps, breaking, placing, jumping)
 * without external audio assets.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.noiseBuffer = null;
    this.btnPressBuffer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.createNoiseBuffer();
      this.loadMultiCraftAudio();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  async loadMultiCraftAudio() {
    try {
      const resp = await fetch('assets/audio/btn_press.ogg');
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        if (this.ctx) {
          this.btnPressBuffer = await this.ctx.decodeAudioData(arrayBuf);
        }
      }
    } catch (e) {
      // Offline or fallback to procedural audio
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5s noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  // MultiCraft UI Button Press Tone
  playButtonClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.btnPressBuffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.btnPressBuffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.6;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch (err) {}
    }

    // High-fidelity procedural MultiCraft button click fallback
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.045);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Play footstep sound according to block material
  playStep(soundType = 'grass') {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (soundType === 'grass') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 200, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      source.playbackRate.value = 0.8 + Math.random() * 0.4;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.09);
    } else if (soundType === 'sand') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 300, t);
      filter.Q.value = 1.2;
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      source.playbackRate.value = 0.7 + Math.random() * 0.4;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.1);
    } else if (soundType === 'wood') {
      // Wood has a resonant thud + click
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 30, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      oscGain.gain.setValueAtTime(0.12, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.06);
    } else if (soundType === 'water') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.16);
    } else if (soundType === 'gravel') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650 + Math.random() * 250, t);
      filter.Q.value = 1.8;
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      source.playbackRate.value = 0.8 + Math.random() * 0.4;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.11);
    } else if (soundType === 'snow') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500 + Math.random() * 200, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      source.playbackRate.value = 0.9 + Math.random() * 0.3;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.09);
    } else {
      // Stone / default
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220 + Math.random() * 60, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
      oscGain.gain.setValueAtTime(0.09, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1500, t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.05);
    }
  }

  // Play block break sound (crunchy burst)
  playBreak(soundType = 'stone') {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (soundType === 'grass' || soundType === 'leaves') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000 + Math.random() * 400, t);
      filter.Q.value = 1.0;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      source.playbackRate.value = 0.9 + Math.random() * 0.3;
    } else if (soundType === 'wood') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      source.playbackRate.value = 0.7 + Math.random() * 0.3;
    } else {
      // Stone / rock crack
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + Math.random() * 300, t);
      filter.Q.value = 1.5;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      source.playbackRate.value = 1.2 + Math.random() * 0.5;
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.2);
  }

  // Play block place sound (crisp thud / snap)
  playPlace(soundType = 'stone') {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = soundType === 'wood' ? 120 : (soundType === 'grass' ? 180 : 160);
    osc.frequency.setValueAtTime(baseFreq + Math.random() * 30, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    // Click attack
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.05);
  }

  // Play jump sound (airy puff)
  playJump() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.12);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Classic Minecraft Hurt / Grunt Sound (Oof!)
  playHurt() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.14);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Weapon swing & attack impact (supports critical hit chime)
  playAttack(isCritical = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    // Swoosh
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.13);

    // Critical strike chime
    if (isCritical) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.05);
      oscGain.gain.setValueAtTime(0.2, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    }
  }

  // Water entry / splash sound
  playSplash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.25);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.28);
  }

  // Food eating (crunching bite)
  playEat() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 400, t);
    filter.Q.value = 2.0;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.09);
  }

  // Satisfaction burp after eating to full
  playBurp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.linearRampToValueAtTime(130, t + 0.1);
    osc.frequency.linearRampToValueAtTime(80, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Creeper fuse hiss (ticking down)
  playFuse() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3500, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.42);
  }

  // Authentic TNT / Creeper explosion (deep punch + crackle)
  playExplosion() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    // Low rumble boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.6);
    oscGain.gain.setValueAtTime(0.6, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.66);

    // Crackle noise burst
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.7);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.72);
  }

  // Pig Oink
  playMobOink() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(240, t + 0.08);
    osc.frequency.linearRampToValueAtTime(300, t + 0.15);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  // Zombie Groan (eerie low moan)
  playMobGroan() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(85, t + 0.4);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.46);
  }

  // Authentic Minecraft Level-up Chime
  playLevelUp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.12, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.26);
    });
  }

  // Bow release twang (string release + pitch sweep)
  playBowTwang(charge = 1.0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    // String snap
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 180 + charge * 140;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.12);
    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);

    // High frequency string release click
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.06);
  }

  // Arrow impact thud into block or flesh
  playArrowHit() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280 + Math.random() * 40, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Skeleton bone rattling sound
  playSkeletonRattle() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + Math.random() * 500, t + i * 0.04);
      filter.Q.value = 4.0;
      gain.gain.setValueAtTime(0.12, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.04);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t + i * 0.04);
      source.stop(t + i * 0.04 + 0.05);
    }
  }

  // Spider chittering hiss
  playSpiderHiss() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600 + Math.random() * 400, t);
    filter.Q.value = 3.0;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t);
    source.stop(t + 0.24);
  }

  // Spooky ambient subterranean cave drone
  playCaveDrone() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, t); // A1 sub-bass
    osc1.frequency.linearRampToValueAtTime(65, t + 1.5);
    osc1.frequency.linearRampToValueAtTime(45, t + 3.0);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(58, t); // Slight detune for eerie beating
    osc2.frequency.linearRampToValueAtTime(68, t + 1.5);
    osc2.frequency.linearRampToValueAtTime(48, t + 3.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.linearRampToValueAtTime(320, t + 1.2);
    filter.frequency.linearRampToValueAtTime(90, t + 3.0);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 3.3);
    osc2.stop(t + 3.3);
  }
}
