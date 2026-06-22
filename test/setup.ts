import 'dotenv/config';
import '@testing-library/jest-dom/vitest';

// Point lib/db/client at the TEST database, not the dev one. Done here
// (before any test file imports kick in) so client.ts itself can stay branch-
// free — it just reads DATABASE_URL. Safety: helpers also assert
// current_database = 'brickvoyage_test' before any destructive op.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

// jsdom has no WebGL or WebAudio — stub them so HUD/React tests don't crash
// when a component happens to construct a renderer or audio context.
// (Game logic is tested via mocked Three.js, not a real GL context.)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
}

// Minimal WebAudio stub
class FakeAudioContext {
  state = 'suspended';
  currentTime = 0;
  destination = {};
  createGain() { return { gain: { value: 0, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
  createBufferSource() { return { buffer: null, loop: false, connect() {}, start() {} }; }
  createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} }; }
  resume() { return Promise.resolve(); }
}
// @ts-expect-error test stub
globalThis.AudioContext = FakeAudioContext;
