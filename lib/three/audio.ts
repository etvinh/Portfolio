// Synthesized WebAudio — no external files.
//
// Three sounds total:
//   - Ambient ocean (looping low-passed noise with a slow LFO swell)
//   - Dock chime (3-note arpeggio)
//   - UI click (triangle sweep)
//
// Lazy-init: AudioContext only spins up on the first setOn(true) call so we
// don't hit autoplay restrictions or open an unused audio graph.

export type GameAudio = {
  setOn: (on: boolean) => void;
  chime: () => void;
  click: () => void;
  dispose: () => void;
};

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

export function createAudio(reducedMotion: boolean): GameAudio | null {
  const w = window as AudioWindow;
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;

  const init = (): void => {
    if (ctx) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // ---- ambient ocean: 4-second loop of low-passed noise + slow LFO ----
    const dur = 4;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const w2 = Math.random() * 2 - 1;
      last = (last + 0.02 * w2) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;

    const ocean = ctx.createGain();
    ocean.gain.value = 0.16;
    src.connect(lp);
    lp.connect(ocean);
    ocean.connect(master);
    src.start();

    // LFO for the slow swell on the ambient
    const lfo = ctx.createOscillator();
    lfo.frequency.value = reducedMotion ? 0.06 : 0.13;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.08;
    lfo.connect(lfoG);
    lfoG.connect(ocean.gain);
    lfo.start();
  };

  return {
    setOn: (on) => {
      init();
      if (!ctx || !master) return;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.25);
    },

    chime: () => {
      if (!ctx || !master) return;
      const t0 = ctx.currentTime;
      // C-E-G arpeggio
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx!.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx!.createGain();
        const s = t0 + i * 0.09;
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.28, s + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, s + 0.55);
        o.connect(g);
        g.connect(master!);
        o.start(s);
        o.stop(s + 0.6);
      });
    },

    click: () => {
      if (!ctx || !master) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(880, t0);
      o.frequency.exponentialRampToValueAtTime(440, t0 + 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.1);
    },

    dispose: () => {
      if (ctx) {
        try {
          ctx.close();
        } catch {
          /* noop */
        }
      }
      ctx = null;
      master = null;
    },
  };
}
