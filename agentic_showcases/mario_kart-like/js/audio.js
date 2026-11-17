/**
 * audio.js - Web Audio API Procedural Synthesizer for Mario Kart
 * Zero external audio assets - 100% offline, procedural sound effects & arcade BGM
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.bgmTimer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    // Master volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Engine Synthesizer Nodes
    this.initEngineSynth();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngineSynth() {
    if (!this.ctx) return;
    try {
      // Main sawtooth oscillator for kart engine rumble
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      // Low frequency sub-rumble oscillator
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      // Engine low-pass filter to soften the buzz
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

      // Engine volume gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start();
      this.engineSubOsc.start();
    } catch (e) {
      console.warn('Audio engine synth init:', e);
    }
  }

  // Update engine pitch & volume based on player speed and throttle
  updateEngine(speed, maxSpeed, isAccelerating) {
    if (!this.ctx || !this.engineGain || this.isMuted) return;

    const normSpeed = Math.max(0, Math.min(1.5, Math.abs(speed) / (maxSpeed || 1)));
    const targetFreq = 42 + (normSpeed * 140) + (isAccelerating ? 25 : 0);
    const targetVolume = isAccelerating ? 0.28 : (normSpeed > 0.05 ? 0.16 : 0.08);

    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(200 + normSpeed * 450, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.1);
  }

  // Drift Screech Sound
  playDriftScreech() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(580 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Mini-Turbo Boost Release Pop!
  playTurboBoost(stage = 1) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = stage === 3 ? 550 : (stage === 2 ? 440 : 330);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.28);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Item Box Pickup & Roulette Sound
  playItemBoxHit() {
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);
    });
  }

  // Item Roulette Roll Tick
  playItemRollTick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800 + Math.random() * 300, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Item Decided Fanfare Ding!
  playItemReady() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Mushroom Super Speed Boost
  playMushroom() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.45);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Shoot Shell Projectile
  playShellShoot() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Slip on Banana (Comic Slide Whistle)
  playBananaSlip() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.4);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // Coin Collection Ding-Ding
  playCoin() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.35);
  }

  // Countdown Beeps (3, 2, 1, GO!)
  playCountdownBeep(isGo = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (isGo) {
      osc.frequency.setValueAtTime(880, now); // A5 High
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      osc.frequency.setValueAtTime(440, now); // A4 Mid
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
  }

  // Upbeat Synthesized Mario Kart Style Racing Loop
  startBGM() {
    if (this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;

    // Upbeat chords and bassline progression
    // C Major -> A Minor -> F Major -> G Major
    const tempo = 135;
    const beatSec = 60 / tempo;
    const sixteenth = beatSec / 4;

    const melodyNotes = [
      // Bar 1: C
      523.25, 0, 523.25, 659.25, 783.99, 0, 880.00, 783.99,
      659.25, 0, 587.33, 523.25, 587.33, 659.25, 0, 0,
      // Bar 2: Am
      440.00, 0, 440.00, 523.25, 659.25, 0, 783.99, 659.25,
      523.25, 0, 440.00, 392.00, 440.00, 523.25, 0, 0,
      // Bar 3: F
      349.23, 0, 440.00, 523.25, 698.46, 0, 659.25, 587.33,
      523.25, 0, 440.00, 392.00, 440.00, 523.25, 0, 0,
      // Bar 4: G
      392.00, 0, 493.88, 587.33, 783.99, 0, 880.00, 987.77,
      1046.50, 0, 987.77, 880.00, 783.99, 0, 0, 0
    ];

    const bassNotes = [
      // Bar 1: C
      130.81, 130.81, 196.00, 130.81, 130.81, 130.81, 196.00, 130.81,
      // Bar 2: Am
      110.00, 110.00, 164.81, 110.00, 110.00, 110.00, 164.81, 110.00,
      // Bar 3: F
      87.31, 87.31, 130.81, 87.31, 87.31, 87.31, 130.81, 87.31,
      // Bar 4: G
      98.00, 98.00, 146.83, 98.00, 98.00, 98.00, 146.83, 98.00
    ];

    let currentStep = 0;
    const totalSteps = melodyNotes.length;

    const playStep = () => {
      if (!this.bgmPlaying || !this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;

      // Play melody
      const mFreq = melodyNotes[currentStep];
      if (mFreq > 0) {
        const mOsc = this.ctx.createOscillator();
        const mGain = this.ctx.createGain();
        mOsc.type = 'square';
        mOsc.frequency.setValueAtTime(mFreq, now);

        mGain.gain.setValueAtTime(0.06, now);
        mGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenth * 1.5);

        mOsc.connect(mGain);
        mGain.connect(this.masterGain);

        mOsc.start(now);
        mOsc.stop(now + sixteenth * 1.5);
      }

      // Play bassline
      const bIdx = Math.floor(currentStep / 2) % bassNotes.length;
      if (currentStep % 2 === 0) {
        const bFreq = bassNotes[bIdx];
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bFreq, now);

        bGain.gain.setValueAtTime(0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenth * 1.8);

        bOsc.connect(bGain);
        bGain.connect(this.masterGain);

        bOsc.start(now);
        bOsc.stop(now + sixteenth * 1.8);
      }

      // Hi-hat groove on off-beats
      if (currentStep % 2 === 1) {
        const hOsc = this.ctx.createOscillator();
        const hGain = this.ctx.createGain();
        hOsc.type = 'sawtooth';
        hOsc.frequency.setValueAtTime(8000 + Math.random() * 2000, now);

        hGain.gain.setValueAtTime(0.02, now);
        hGain.gain.exponentialRampToValueAtTime(0.0001, now + sixteenth * 0.5);

        hOsc.connect(hGain);
        hGain.connect(this.masterGain);

        hOsc.start(now);
        hOsc.stop(now + sixteenth * 0.5);
      }

      currentStep = (currentStep + 1) % totalSteps;
      this.bgmTimer = setTimeout(playStep, sixteenth * 1000);
    };

    playStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

const AudioSys = new SoundEngine();
