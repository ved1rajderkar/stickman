/**
 * SoundManager — Hybrid audio system with Synthwave BGM
 * Pillar 5: Ultra-Optimized Audio & Loading System
 *
 * Features:
 * - Procedural Synthwave/Electronic background track (no files needed)
 * - Punchy synthesized SFX: shooting, hitting, jumping, reloading
 * - Real audio file support for heavy impacts
 * - Audio context created on first user interaction
 */
class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.volume = 0.7;
        this.bgmVolume = 0.3;
        this.muted = false;
        this.bgmMuted = false;
        this.sounds = {};
        this.webAudioReady = false;
        this.initialized = false;

        // BGM state
        this.bgmPlaying = false;
        this.bgmNodes = [];
        this.bgmMasterGain = null;
        this.bgmInterval = null;
        this.bgmBeatIndex = 0;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.webAudioReady = true;
            this.initialized = true;
            this.preloadSounds();
            this.startBGM();
        } catch (e) {
            console.warn('[Audio] Web Audio API not available:', e);
        }
    }

    preloadSounds() {
        const files = {
            sword_slash: 'assets/sounds/sword_slash.ogg',
            sword_hit: 'assets/sounds/sword_hit.ogg',
            bat_swing: 'assets/sounds/bat_swing.ogg',
            bat_hit: 'assets/sounds/bat_hit.ogg',
            pistol: 'assets/sounds/gun_pistol.ogg',
            shotgun: 'assets/sounds/gun_shotgun.ogg',
            explosion: 'assets/sounds/explosion.ogg',
            punch_hit: 'assets/sounds/punch_hit.ogg',
            death: 'assets/sounds/death.ogg',
            round_start: 'assets/sounds/round_start.ogg'
        };

        for (const [key, path] of Object.entries(files)) {
            try {
                const audio = new Audio(path);
                audio.preload = 'auto';
                audio.volume = this.volume;
                audio.addEventListener('error', () => {});
                this.sounds[key] = audio;
            } catch (e) {}
        }
    }

    play(name, volumeMultiplier = 1.0) {
        if (this.muted || !this.initialized) return;
        const snd = this.sounds[name];
        if (!snd) {
            if (name === 'level_complete') {
                this.synthLevelComplete();
                return;
            }
            return;
        }
        try {
            const clone = snd.cloneNode();
            clone.volume = Math.min(1.0, this.volume * volumeMultiplier);
            clone.play().catch(() => {});
        } catch (e) {}
    }

    // ─── SYNTHWAVE BACKGROUND TRACK ─────────────────────────────────────
    // Procedurally generated 4-bar loop: bass, arpeggio, drums, pad
    // BPM: 128, Key: A minor, No external files needed

    startBGM() {
        if (this.bgmPlaying || !this.webAudioReady) return;
        this.bgmPlaying = true;
        this.bgmBeatIndex = 0;

        this.bgmMasterGain = this.audioCtx.createGain();
        this.bgmMasterGain.gain.value = this.bgmMuted ? 0 : this.bgmVolume;
        this.bgmMasterGain.connect(this.audioCtx.destination);

        // Synthwave chord progression: Am - F - C - G (4 bars, 16 beats)
        this.bgmChords = [
            [220, 261.63, 329.63],  // Am: A3, C4, E4
            [174.61, 220, 261.63],   // F: F3, A3, C4
            [261.63, 329.63, 392],   // C: C4, E4, G4
            [196, 246.94, 293.66]    // G: G3, B3, D4
        ];

        // Bass line (root notes, 16 beats)
        this.bgmBass = [110, 0, 110, 0, 87.31, 0, 87.31, 0, 130.81, 0, 130.81, 0, 98, 0, 98, 0];

        // Arpeggio pattern (higher notes, 16 beats)
        this.bgmArp = [440, 523.25, 659.25, 523.25, 349.23, 440, 523.25, 440, 523.25, 659.25, 783.99, 659.25, 392, 493.88, 587.33, 493.88];

        // Schedule beats at 128 BPM (468.75ms per beat)
        this.scheduleNextBeat();
    }

    scheduleNextBeat() {
        if (!this.bgmPlaying || !this.webAudioReady) return;

        const bpm = 128;
        const beatDuration = 60 / bpm;
        const now = this.audioCtx.currentTime;
        const beatInBar = this.bgmBeatIndex % 4;
        const barIndex = Math.floor(this.bgmBeatIndex / 4) % 4;

        // Kick drum on beats 1, 5, 9, 13 (four-on-the-floor)
        if (this.bgmBeatIndex % 4 === 0) {
            this.playKick(now);
        }

        // Snare on beats 3, 7, 11, 15
        if (this.bgmBeatIndex % 4 === 2) {
            this.playSnare(now);
        }

        // Hi-hat on every beat, quieter on off-beats
        this.playHiHat(now, this.bgmBeatIndex % 2 === 0 ? 0.15 : 0.08);

        // Bass on every beat
        const bassNote = this.bgmBass[this.bgmBeatIndex % 16];
        if (bassNote > 0) {
            this.playBassNote(now, bassNote, beatDuration * 0.8);
        }

        // Arpeggio on every beat
        const arpNote = this.bgmArp[this.bgmBeatIndex % 16];
        if (arpNote > 0) {
            this.playArpNote(now, arpNote, beatDuration * 0.4);
        }

        // Pad chord every 4 beats
        if (beatInBar === 0) {
            this.playPadChord(now, this.bgmChords[barIndex], beatDuration * 3.5);
        }

        this.bgmBeatIndex++;

        this.bgmInterval = setTimeout(() => this.scheduleNextBeat(), beatDuration * 1000 * 0.95);
    }

    playKick(time) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(gain);
        gain.connect(this.bgmMasterGain);
        osc.start(time);
        osc.stop(time + 0.3);
    }

    playSnare(time) {
        // Noise burst
        const bufSize = this.audioCtx.sampleRate * 0.1;
        const buf = this.audioCtx.createBuffer(1, bufSize, this.audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buf;
        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.bgmMasterGain);
        noise.start(time);
        noise.stop(time + 0.15);

        // Tone body
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
        oscGain.gain.setValueAtTime(0.4, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.bgmMasterGain);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playHiHat(time, vol) {
        const bufSize = this.audioCtx.sampleRate * 0.05;
        const buf = this.audioCtx.createBuffer(1, bufSize, this.audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buf;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmMasterGain);
        noise.start(time);
        noise.stop(time + 0.05);
    }

    playBassNote(time, freq, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);
        filter.Q.value = 5;
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.setValueAtTime(0.25, time + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmMasterGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    playArpNote(time, freq, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmMasterGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    playPadChord(time, freqs, duration) {
        freqs.forEach(freq => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 10;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.06, time + 0.2);
            gain.gain.setValueAtTime(0.06, time + duration * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            const filter = this.audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1500;
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bgmMasterGain);
            osc.start(time);
            osc.stop(time + duration);
        });
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmInterval) clearTimeout(this.bgmInterval);
        if (this.bgmMasterGain) {
            this.bgmMasterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5);
        }
    }

    setBGMVolume(val) {
        this.bgmVolume = val;
        if (this.bgmMasterGain && this.webAudioReady) {
            this.bgmMasterGain.gain.linearRampToValueAtTime(this.bgmMuted ? 0 : val, this.audioCtx.currentTime + 0.1);
        }
    }

    // ─── PUNCHY GAME SFX ────────────────────────────────────────────────

    /**
     * Gunshot — punchy layered sound: noise burst + bass thump + high crack
     */
    synthGunshot() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const t = ctx.currentTime;

        // Noise burst (main body)
        const bufSize = ctx.sampleRate * 0.12;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.value = 2000;
        bpFilter.Q.value = 1;
        noise.connect(bpFilter);
        bpFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);

        // Bass thump (impact weight)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        oscGain.gain.setValueAtTime(0.6, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);

        // High crack (sharp transient)
        const crackOsc = ctx.createOscillator();
        const crackGain = ctx.createGain();
        crackOsc.type = 'square';
        crackOsc.frequency.setValueAtTime(3000, t);
        crackOsc.frequency.exponentialRampToValueAtTime(500, t + 0.03);
        crackGain.gain.setValueAtTime(0.2, t);
        crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        crackOsc.connect(crackGain);
        crackGain.connect(ctx.destination);
        crackOsc.start(t);
        crackOsc.stop(t + 0.04);
    }

    /**
     * Hit impact — meaty thud with metallic ring
     */
    synthHit(damage = 10) {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const t = ctx.currentTime;
        const vol = Math.min(0.6, 0.2 + damage * 0.02);

        // Low thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 + damage * 3, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);

        // Metallic ring
        const ring = ctx.createOscillator();
        const ringGain = ctx.createGain();
        ring.type = 'triangle';
        ring.frequency.setValueAtTime(800 + damage * 20, t);
        ring.frequency.exponentialRampToValueAtTime(200, t + 0.1);
        ringGain.gain.setValueAtTime(vol * 0.5, t);
        ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        ring.connect(ringGain);
        ringGain.connect(ctx.destination);
        ring.start(t);
        ring.stop(t + 0.1);
    }

    /**
     * Jump — quick upward whoosh
     */
    synthJump() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    /**
     * Reload — mechanical click-clack sequence
     */
    synthReload() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;

        // Click 1 — magazine out
        const t1 = ctx.currentTime;
        this._playClick(t1, 600, 0.08);

        // Click 2 — magazine in (slightly higher)
        const t2 = ctx.currentTime + 0.2;
        this._playClick(t2, 900, 0.06);

        // Slide rack — noise burst
        const t3 = ctx.currentTime + 0.35;
        const bufSize = ctx.sampleRate * 0.08;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, t3);
        gain.gain.exponentialRampToValueAtTime(0.001, t3 + 0.08);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(t3);
    }

    _playClick(time, freq, duration) {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
    }

    /**
     * Punch whoosh — fist moving through air
     */
    synthPunchWhoosh() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        }
        const source = ctx.createBufferSource();
        source.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    }

    /**
     * Block/parry — short metallic click
     */
    synthBlock() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
    }

    /**
     * UI menu click — tiny tick
     */
    synthUIClick() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
    }

    /**
     * Gold coin collect — rising 3-note chime
     */
    synthGoldPickup() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const freqs = [880, 1100, 1320];
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + i * 0.07;
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.18);
        });
    }

    /**
     * Combo counter increment — rising pitch
     */
    synthComboTick(comboCount) {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 300 + comboCount * 40;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    /**
     * Level complete — triumphant ascending fanfare
     */
    synthLevelComplete() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + i * 0.15;
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    /**
     * Heavy hit — low booming impact
     */
    synthHeavyHit() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);

        const bufSize = ctx.sampleRate * 0.15;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);
    }

    /**
     * KO — descending dramatic tone
     */
    synthKO() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const notes = [440, 349.23, 293.66, 220];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + i * 0.15;
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    /**
     * Weapon pickup — ascending arpeggio
     */
    synthWeaponPickup() {
        if (!this.webAudioReady || this.muted) return;
        const ctx = this.audioCtx;
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + i * 0.06;
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.12);
        });
    }

    setVolume(val) {
        this.volume = val / 10;
        Object.values(this.sounds).forEach(s => { try { s.volume = this.volume; } catch (e) {} });
    }

    setMuted(val) { this.muted = val; }
}

export const soundManager = new SoundManager();

/**
 * AssetLoader — Asynchronous asset loading engine
 */
export class AssetLoader {
    constructor() {
        this.loaded = false;
        this.assets = [];
        this.totalAssets = 0;
        this.loadedCount = 0;
        this.onComplete = null;
    }

    startLoading() {
    }

    addAsset(type, id, src) {
        this.assets.push({ type, id, src, loaded: false });
        this.totalAssets++;
    }

    loadAll(callback) {
        this.onComplete = callback;
        if (this.totalAssets === 0) { this.finishLoading(); return; }
        for (const asset of this.assets) this.loadAsset(asset);
    }

    loadAsset(asset) {
        try {
            switch (asset.type) {
                case 'image': {
                    const img = new Image();
                    img.onload = () => this.onAssetLoaded(asset);
                    img.onerror = () => this.onAssetLoaded(asset);
                    img.src = asset.src;
                    asset.element = img;
                    break;
                }
                case 'audio': {
                    const audio = new Audio(asset.src);
                    audio.oncanplaythrough = () => this.onAssetLoaded(asset);
                    audio.onerror = () => this.onAssetLoaded(asset);
                    audio.preload = 'auto';
                    asset.element = audio;
                    break;
                }
                default: this.onAssetLoaded(asset);
            }
        } catch (e) { this.onAssetLoaded(asset); }
    }

    onAssetLoaded(asset) {
        asset.loaded = true;
        this.loadedCount++;
        if (this.loadedCount >= this.totalAssets) this.finishLoading();
    }

    finishLoading() {
        this.loaded = true;
        if (this.onComplete) this.onComplete();
    }

    getAsset(id) {
        const asset = this.assets.find(a => a.id === id);
        return asset ? asset.element : null;
    }
}
