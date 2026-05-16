class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.volume = 0.7;
        this.muted = false;
        this.sounds = {};
        this.webAudioReady = false;
    }

    init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.webAudioReady = true;
        this.preloadSounds();
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
            const audio = new Audio(path);
            audio.preload = 'auto';
            audio.volume = this.volume;
            this.sounds[key] = audio;
        }
    }

    play(name, volumeMultiplier = 1.0) {
        if (this.muted) return;
        const snd = this.sounds[name];
        if (!snd) return;
        const clone = snd.cloneNode();
        clone.volume = Math.min(1.0, this.volume * volumeMultiplier);
        clone.play().catch(() => {});
    }

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

    setVolume(val) {
        this.volume = val / 10;
        Object.values(this.sounds).forEach(s => s.volume = this.volume);
    }

    setMuted(val) { this.muted = val; }
    muteForAd() { this.muted = true; }
    unmuteAfterAd() { this.muted = false; }
}

export const soundManager = new SoundManager();
