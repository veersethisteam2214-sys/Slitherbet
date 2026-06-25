type SfxName = "step" | "safe" | "level" | "cash" | "death" | "click" | "start";

const SCALE = [0, 3, 5, 7, 10, 12, 15]; // minor pentatonic-ish, semitone offsets
const BASS = [-24, -19, -17, -12];

function midiToFreq(semitoneFromA4: number) {
  return 440 * Math.pow(2, semitoneFromA4 / 12);
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;

  musicOn = true;
  sfxOn = true;
  sfxVolume = 0.7;

  ensure() {
    if (this.ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? this.sfxVolume : 0;
    this.sfxBus.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.32 : 0;
    this.musicBus.connect(this.master);
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setSfxOn(on: boolean) {
    this.sfxOn = on;
    if (this.sfxBus) this.sfxBus.gain.value = on ? this.sfxVolume : 0;
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
    if (this.sfxBus && this.sfxOn) this.sfxBus.gain.value = v;
  }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    this.ensure();
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.2);
    }
    if (on) this.startMusic();
    else this.stopMusic();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, bus: GainNode, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private slide(from: number, to: number, dur: number, type: OscillatorType, gain: number, bus: GainNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, bus: GainNode) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    src.connect(filter);
    filter.connect(g);
    g.connect(bus);
    src.start(t);
  }

  play(name: SfxName) {
    this.ensure();
    this.resume();
    if (!this.ctx || !this.sfxBus) return;
    const bus = this.sfxBus;
    switch (name) {
      case "step":
        this.tone(520, 0.12, "square", 0.18, bus);
        break;
      case "safe":
        this.tone(660, 0.1, "triangle", 0.22, bus, 0);
        this.tone(880, 0.16, "triangle", 0.22, bus, 0.06);
        break;
      case "level":
        [660, 784, 988].forEach((f, i) => this.tone(f, 0.14, "triangle", 0.2, bus, i * 0.05));
        break;
      case "cash":
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, "sine", 0.2, bus, i * 0.06));
        break;
      case "death":
        this.slide(320, 60, 0.5, "sawtooth", 0.28, bus);
        this.noise(0.4, 0.3, bus);
        break;
      case "start":
        this.slide(220, 520, 0.25, "triangle", 0.22, bus);
        break;
      case "click":
        this.tone(420, 0.05, "square", 0.12, bus);
        break;
    }
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || !this.musicBus || this.musicTimer !== null) return;
    const beat = 0.34;
    const loop = () => {
      if (!this.ctx || !this.musicBus) return;
      const bus = this.musicBus;
      const root = BASS[Math.floor(this.step / 8) % BASS.length];
      if (this.step % 2 === 0) this.tone(midiToFreq(root), beat * 1.6, "sine", 0.5, bus);
      const note = SCALE[Math.floor(Math.random() * SCALE.length)] + root + 24;
      this.tone(midiToFreq(note), beat * 1.1, "triangle", 0.28, bus);
      if (this.step % 4 === 2) this.tone(midiToFreq(note + 7), beat, "sine", 0.16, bus);
      this.step += 1;
    };
    loop();
    this.musicTimer = window.setInterval(loop, beat * 1000);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();
export type { SfxName };
