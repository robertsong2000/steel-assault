// ===================== 音频系统：合成音效 + 原创芯片BGM + CC0短音乐 =====================
// BGM 为原创曲（A小调行进摇滚动机），不引用任何现成游戏旋律。
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 关卡BGM：8小节 x 16步。0=休止
const LEVEL_BASS_ROOT = [33, 33, 29, 31, 33, 33, 29, 28]; // A1 A1 F1 G1 A1 A1 F1 E1
const LEVEL_LEAD = [
  69, 0, 72, 0, 76, 0, 74, 72, 0, 69, 0, 71, 72, 0, 0, 0,
  69, 0, 72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0,
  77, 0, 77, 0, 76, 0, 74, 0, 72, 0, 74, 76, 74, 0, 72, 0,
  74, 0, 74, 0, 76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 74, 0,
  69, 0, 72, 0, 76, 0, 74, 72, 0, 69, 0, 71, 72, 0, 0, 0,
  81, 0, 79, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 0, 0,
  77, 0, 81, 0, 84, 0, 81, 0, 77, 0, 76, 0, 74, 0, 76, 0,
  76, 0, 76, 0, 80, 0, 83, 0, 80, 76, 71, 73, 74, 76, 0, 0,
];
// Boss BGM：更凶，同和声高八度+密集
const BOSS_LEAD = LEVEL_LEAD.map((m, i) => {
  if (m === 0) return i % 4 === 3 ? 57 : 0; // 补重复根音制造紧迫感
  return m + 12;
});

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.step = 0;
    this.mode = null;
    this.jingles = {};
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.75;
      this.bgmGain.connect(this.master);
      this.loadJingles();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.45;
    return this.muted;
  }

  async loadJingles() {
    for (const name of ['victory', 'defeat', 'start']) {
      try {
        const res = await fetch(`assets/audio/${name}.ogg`);
        const buf = await res.arrayBuffer();
        this.jingles[name] = await this.ctx.decodeAudioData(buf);
      } catch (e) {
        this.jingles[name] = null; // 解码失败时用合成兜底
      }
    }
  }

  playJingle(name) {
    if (!this.ctx) return;
    const buf = this.jingles[name];
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.sfxGain);
      src.start();
    } else {
      // 合成兜底：胜利=上行琶音，失败=下行，开始=两音号角
      const seqs = {
        victory: [69, 72, 76, 81, 84],
        defeat: [64, 60, 57, 52],
        start: [57, 64, 69],
      };
      (seqs[name] || seqs.start).forEach((m, i) => {
        this.tone(mtof(m), 0.16, 'square', 0.16, this.ctx.currentTime + i * 0.13);
      });
    }
  }

  // ---- 基础发声 ----
  tone(freq, dur, type = 'square', vol = 0.2, when = 0, slideTo = 0, dest = null) {
    if (!this.ctx) return;
    const t0 = when || this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noise(dur, vol = 0.25, freq = 1200, q = 0.8, when = 0, slideTo = 0) {
    if (!this.ctx) return;
    const t0 = when || this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  // ---- 游戏音效 ----
  sfx(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'shoot':   this.tone(900, 0.07, 'square', 0.12, t, 300); this.noise(0.04, 0.06, 4000); break;
      case 'spread':  this.tone(620, 0.09, 'square', 0.12, t, 200); this.noise(0.05, 0.08, 3000); break;
      case 'eshoot':  this.tone(340, 0.09, 'sawtooth', 0.07, t, 180); break;
      case 'jump':    this.tone(260, 0.14, 'square', 0.1, t, 620); break;
      case 'hit':     this.tone(400, 0.35, 'sawtooth', 0.2, t, 60); this.noise(0.3, 0.2, 900, 0.8, t, 120); break;
      case 'explode': this.noise(0.28, 0.28, 1600, 0.6, t, 150); this.tone(140, 0.2, 'sine', 0.25, t, 45); break;
      case 'bigExplode':
        this.noise(0.7, 0.4, 2200, 0.5, t, 80);
        this.tone(90, 0.6, 'sine', 0.4, t, 30);
        this.noise(0.4, 0.25, 500, 0.8, t + 0.1, 60);
        break;
      case 'powerup': this.tone(523, 0.1, 'square', 0.14, t); this.tone(784, 0.12, 'square', 0.14, t + 0.09); this.tone(1047, 0.2, 'square', 0.14, t + 0.18); break;
      case 'bossHit': this.tone(1200, 0.05, 'square', 0.08, t, 900); break;
      case 'turretDie': this.noise(0.2, 0.2, 2000, 0.7, t, 200); this.tone(220, 0.15, 'square', 0.12, t, 60); break;
      case 'select':  this.tone(880, 0.08, 'square', 0.12, t); break;
      case 'konami':  [66, 69, 73, 76, 78, 81, 85].forEach((m, i) => this.tone(mtof(m), 0.1, 'square', 0.13, t + i * 0.07)); break;
    }
  }

  // ---- BGM 步进音序器 ----
  startBGM(mode) {
    if (!this.ctx) return;
    this.stopBGM();
    this.mode = mode;
    this.step = 0;
    this.bpm = mode === 'boss' ? 162 : 150;
    this.stepDur = 60 / this.bpm / 4;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.bgmTimer = setInterval(() => this.schedule(), 42);
  }

  stopBGM() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    this.bgmTimer = null;
    this.mode = null;
  }

  schedule() {
    if (!this.ctx) return;
    while (this.nextTime < this.ctx.currentTime + 0.16) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 128;
      this.nextTime += this.stepDur;
    }
  }

  playStep(step, t) {
    if (this.muted) return;
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const boss = this.mode === 'boss';
    const g = this.bgmGain;
    // 鼓
    const kickSteps = boss ? [0, 4, 8, 12, 14] : [0, 4, 8, 12];
    if (kickSteps.includes(s16)) this.tone(130, 0.09, 'sine', 0.5, t, 42, g);
    if (s16 === 4 || s16 === 12) this.noiseHit(t, g);
    if (s16 % 2 === 0 || boss) this.hat(t, s16 % 4 === 2 ? 0.09 : 0.05, g);
    // 贝斯
    const root = LEVEL_BASS_ROOT[bar] + 12;
    const bassHit = boss ? true : s16 % 2 === 0;
    if (bassHit) {
      const oct = boss ? (s16 % 4 === 2 ? 12 : 0) : (s16 === 6 || s16 === 14 ? 12 : 0);
      this.tone(mtof(root + oct), this.stepDur * 0.9, 'triangle', 0.34, t, 0, g);
    }
    // 主音
    const lead = boss ? BOSS_LEAD : LEVEL_LEAD;
    const m = lead[step];
    if (m) {
      this.tone(mtof(m), this.stepDur * (boss ? 0.95 : 1.7), 'square', 0.075, t, 0, g);
      this.tone(mtof(m) * 0.5, this.stepDur * 1.2, 'square', 0.04, t, 0, g); // 低八度加厚
    }
  }

  noiseHit(t, g) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * 0.09);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const gg = this.ctx.createGain();
    gg.gain.setValueAtTime(0.32, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(f).connect(gg).connect(g);
    src.start(t);
  }

  hat(t, vol, g) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const gg = this.ctx.createGain();
    gg.gain.setValueAtTime(vol, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(f).connect(gg).connect(g);
    src.start(t);
  }
}
