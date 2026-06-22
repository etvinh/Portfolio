import * as THREE from 'three';
import { InputManager } from './input';
import { createBoat, type Boat } from './boat';
import { createSceneBundle, type SceneBundle } from './scene';
import { createSky, type Sky } from './sky';
import { createWater, type Water } from './water';
import { collideBoat } from './collision';
import { buildAllIslands, type Island } from './islands';

// Game state surface exposed to React. The HUD subscribes and re-renders
// when fields change. Kept intentionally minimal — most of the world state
// lives in plain Three.js objects we never hand to React.
export type GameState = {
  soundOn: boolean;
  isMobile: boolean;
};

const SKY_COLOR = '#9fd3ff';
const SEA_COLOR = '#0a4a6e'; // darker than the prototype's #1c7ed6
const HULL_COLOR = '#e03131';

export class Game {
  private mountEl: HTMLElement;
  private input = new InputManager();
  private sceneBundle: SceneBundle | null = null;
  private water: Water | null = null;
  private sky: Sky | null = null;
  private boat: Boat | null = null;
  private islands: Island[] = [];
  private clock = new THREE.Clock();
  private raf = 0;
  private speed = 0;
  private boatAngle = 0;
  private cameraLook = new THREE.Vector3(0, 1.5, 0);
  private reduced = false;
  private state: GameState = { soundOn: false, isMobile: false };
  private subs = new Set<(s: GameState) => void>();
  private resizeHandler: (() => void) | null = null;

  constructor(mountEl: HTMLElement) {
    this.mountEl = mountEl;
  }

  start(): void {
    this.reduced =
      typeof window.matchMedia !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile =
      (typeof window.matchMedia !== 'undefined' &&
        window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window;
    this.state = { ...this.state, isMobile };
    this.emit();

    const bundle = createSceneBundle(this.mountEl, SKY_COLOR);
    if (!bundle) {
      this.mountEl.innerHTML =
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:Nunito,sans-serif;font-weight:700;color:#46555f;text-align:center;padding:24px;">Couldn\'t start the 3D view. Try reloading the tab.</div>';
      return;
    }
    this.sceneBundle = bundle;

    this.sky = createSky(SKY_COLOR);
    bundle.scene.add(this.sky.mesh);

    // Build islands BEFORE water — the water shader takes their positions +
    // visual radii as a uniform array for the shoreline foam effect.
    this.islands = buildAllIslands(bundle.scene);

    this.water = createWater(
      SEA_COLOR,
      this.reduced,
      this.islands.map((i) => ({
        x: i.pos.x,
        z: i.pos.z,
        // Island.collR is the visual radius × 1.7 — recover the visual one.
        radius: i.collR / 1.7,
      })),
    );
    // Deep plane sits below the surface; surface added second so transparent
    // composite layers on top.
    bundle.scene.add(this.water.deep);
    bundle.scene.add(this.water.mesh);

    this.boat = createBoat(HULL_COLOR);
    bundle.scene.add(this.boat.group);

    // keyboard focus: an embedded iframe only receives keydown once focused
    this.mountEl.setAttribute('tabindex', '0');
    this.mountEl.style.outline = 'none';
    const focusStage = () => {
      try {
        window.focus();
        this.mountEl.focus({ preventScroll: true });
      } catch {
        /* noop */
      }
    };
    this.mountEl.addEventListener('pointerdown', focusStage);
    bundle.renderer.domElement.addEventListener('pointerdown', focusStage);
    focusStage();

    this.input.start();

    this.resizeHandler = () => {
      if (!this.sceneBundle) return;
      const w = this.mountEl.clientWidth;
      const h = this.mountEl.clientHeight;
      this.sceneBundle.camera.aspect = w / h;
      this.sceneBundle.camera.updateProjectionMatrix();
      this.sceneBundle.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this.resizeHandler);

    this.clock = new THREE.Clock();
    this.animate();
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.resizeHandler = null;
    this.input.stop();
    if (this.sceneBundle) {
      try {
        this.sceneBundle.renderer.dispose();
        this.sceneBundle.renderer.forceContextLoss();
      } catch {
        /* noop */
      }
      if (this.sceneBundle.renderer.domElement.parentNode === this.mountEl) {
        this.mountEl.removeChild(this.sceneBundle.renderer.domElement);
      }
    }
    this.sceneBundle = null;
    this.water = null;
    this.sky = null;
    this.boat = null;
    this.islands = [];
    this.subs.clear();
  }

  subscribe(cb: (s: GameState) => void): () => void {
    this.subs.add(cb);
    cb(this.state);
    return () => this.subs.delete(cb);
  }

  private emit(): void {
    this.subs.forEach((cb) => cb(this.state));
  }

  // ---- main loop ----

  private animate = (): void => {
    if (!this.sceneBundle || !this.boat || !this.water) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const { throttle, turn } = this.input.read();

    // motion model from the prototype
    this.speed += throttle * 28 * dt;
    this.speed *= 1 - 1.4 * dt;
    this.speed = Math.max(-9, Math.min(23, this.speed));
    const moveFactor = Math.max(0.28, Math.min(1, Math.abs(this.speed) / 6));
    this.boatAngle -=
      turn * 1.9 * dt * moveFactor * (this.speed < 0 ? -1 : 1);
    const fx = -Math.sin(this.boatAngle);
    const fz = -Math.cos(this.boatAngle);
    const boatGroup = this.boat.group;
    boatGroup.position.x += fx * this.speed * dt;
    boatGroup.position.z += fz * this.speed * dt;
    boatGroup.position.x = Math.max(-240, Math.min(240, boatGroup.position.x));
    boatGroup.position.z = Math.max(-240, Math.min(240, boatGroup.position.z));

    // push-out collision against island lumps + pier pilings
    this.speed = collideBoat(boatGroup.position, this.islands, this.speed);

    boatGroup.rotation.y = this.boatAngle;

    // bob + bank + pitch
    const bobAmt = this.reduced ? 0.05 : 0.18;
    const model = this.boat.model;
    model.position.y = Math.sin(t * 2.2) * bobAmt;
    const targetBank = -turn * 0.16;
    model.rotation.z += (targetBank - model.rotation.z) * Math.min(1, dt * 6);
    model.rotation.x = Math.sin(t * 1.7) * bobAmt * 0.4 - this.speed * 0.004;

    // tick the Three.js Water shader (normal-map UV scroll)
    this.water.update(dt);

    // per-island tickers (e.g. socials' rotating lighthouse beam)
    for (const is of this.islands) {
      is.tick?.(dt, t, this.reduced);
    }

    // simple chase camera — proper "arc to active panel" lands in chunk 3
    const dist = 86;
    const height = 48;
    const camera = this.sceneBundle.camera;
    const desired = new THREE.Vector3(
      boatGroup.position.x - fx * dist,
      height,
      boatGroup.position.z - fz * dist,
    );
    const lookT = new THREE.Vector3(
      boatGroup.position.x + fx * 12,
      3.0,
      boatGroup.position.z + fz * 12,
    );
    const camF = this.reduced ? Math.min(1, dt * 2) : Math.min(1, dt * 3.4);
    camera.position.lerp(desired, camF);
    this.cameraLook.lerp(lookT, camF);
    camera.lookAt(this.cameraLook);

    this.sceneBundle.renderer.render(this.sceneBundle.scene, camera);
    this.raf = requestAnimationFrame(this.animate);
  };
}
