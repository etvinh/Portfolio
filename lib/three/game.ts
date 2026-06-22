import * as THREE from 'three';
import { InputManager } from './input';
import { createBoat, type Boat } from './boat';
import { createSceneBundle, type SceneBundle } from './scene';
import { createSky, type Sky } from './sky';
import { createWater, type Water } from './water';
import { collideBoat } from './collision';
import { buildAllIslands, type Island } from './islands';
import { createClouds } from './clouds';
import { createBirds, type BirdData } from './birds';
import { createAudio, type GameAudio } from './audio';

// ---- React-facing state ----
//
// Thin slice of what the HUD needs. Most world state (Three.js objects,
// foam wake, clouds) stays inside the Game class and never crosses into
// React.

export type IslandSummary = {
  id: string;
  title: string;
  panel: string;
  posX: number;
  posZ: number;
  mini: string;
};

export type DockTarget = { id: string; title: string; panel: string };

export type GameState = {
  soundOn: boolean;
  isMobile: boolean;
  dockTarget: DockTarget | null; // when null, hide the dock prompt
  activePanel: string | null; // when null, no panel open
  visited: Record<string, boolean>;
  total: number;
  // Toast set by markVisited; cleared after a few seconds.
  achievement: { title: string; all: boolean } | null;
  islands: IslandSummary[];
};

const VISITED_STORAGE_KEY = 'brickVoyage.visited.v1';
const DOCK_RANGE = 16;
const AUTO_CLOSE_RANGE = 26;

const SKY_COLOR = '#9fd3ff';
const SEA_COLOR = '#0a4a6e';
const HULL_COLOR = '#e03131';

export class Game {
  private mountEl: HTMLElement;
  private input = new InputManager();
  private sceneBundle: SceneBundle | null = null;
  private water: Water | null = null;
  private sky: Sky | null = null;
  private boat: Boat | null = null;
  private islands: Island[] = [];
  private clouds: THREE.Group[] = [];
  private birds: THREE.Group[] = [];
  private foamGeo: THREE.CircleGeometry | null = null;
  private foams: { mesh: THREE.Mesh; life: number }[] = [];
  private foamT = 0;
  private clock = new THREE.Clock();
  private raf = 0;
  private speed = 0;
  private boatAngle = 0;
  private cameraLook = new THREE.Vector3(0, 1.5, 0);
  private reduced = false;
  private autopilot = false;
  // Tracked separately from state so we don't emit when the nearest
  // island hasn't changed (avoids re-render storms on every frame).
  private promptId = '_none_';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private miniCanvas: HTMLCanvasElement | null = null;
  private audio: GameAudio | null = null;

  private state: GameState = {
    soundOn: false,
    isMobile: false,
    dockTarget: null,
    activePanel: null,
    visited: {},
    total: 0,
    achievement: null,
    islands: [],
  };
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
        radius: i.collR / 1.7,
      })),
    );
    bundle.scene.add(this.water.deep);
    bundle.scene.add(this.water.mesh);

    this.boat = createBoat(HULL_COLOR);
    bundle.scene.add(this.boat.group);

    // ---- foam wake geo (shared by all wake circles) ----
    this.foamGeo = new THREE.CircleGeometry(1, 14);
    this.foamGeo.rotateX(-Math.PI / 2);

    // ---- atmosphere ----
    this.clouds = createClouds(bundle.scene);
    this.birds = createBirds(bundle.scene);

    // ---- audio (lazy: AudioContext only spins up on first toggle) ----
    this.audio = createAudio(this.reduced);

    // ---- load saved achievements ----
    let visited: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(VISITED_STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(saved)) {
        visited = Object.fromEntries(saved.map((id: unknown) => [String(id), true]));
      }
    } catch {
      /* noop */
    }

    // Hand the HUD a stable summary of the islands (purely data — no
    // Three.js refs).
    const islandSummaries: IslandSummary[] = this.islands.map((i) => ({
      id: i.id,
      title: i.title,
      panel: i.panel,
      posX: i.pos.x,
      posZ: i.pos.z,
      mini: i.mini,
    }));

    this.state = {
      ...this.state,
      isMobile,
      visited,
      total: this.islands.length,
      islands: islandSummaries,
      // Open the Home Harbor panel on first paint so the player gets an
      // intro instead of being dropped straight onto open water. The camera
      // arc kicks in automatically because activePanel is set.
      activePanel: 'home',
    };
    this.emit();

    // ---- input focus + listeners ----
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
    this.input.onDock(() => this.onDock());

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
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = null;
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.resizeHandler = null;
    this.input.stop();
    this.audio?.dispose();
    this.audio = null;

    // Dispose foam materials before tearing down the scene.
    for (const fo of this.foams) {
      (fo.mesh.material as THREE.Material).dispose();
    }
    this.foams = [];
    this.foamGeo?.dispose();
    this.foamGeo = null;

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
    this.clouds = [];
    this.birds = [];
    this.subs.clear();
  }

  // ---- public command surface (HUD wires buttons to these) ----

  subscribe(cb: (s: GameState) => void): () => void {
    this.subs.add(cb);
    cb(this.state);
    return () => this.subs.delete(cb);
  }

  onDock(): void {
    const target = this.state.dockTarget;
    if (!target || this.state.activePanel) return;
    const island = this.islands.find((i) => i.id === target.id);
    if (!island) return;
    this.audio?.chime();
    this.markVisited(island);
    this.state = {
      ...this.state,
      activePanel: target.panel,
      dockTarget: null,
    };
    this.promptId = '_none_';
    this.emit();
  }

  closePanel(): void {
    if (!this.state.activePanel) return;
    this.audio?.click();
    this.state = { ...this.state, activePanel: null };
    this.emit();
  }

  goHome(): void {
    this.audio?.click();
    this.autopilot = true;
    if (this.state.activePanel) {
      this.state = { ...this.state, activePanel: null };
      this.emit();
    }
  }

  toggleSound(): void {
    if (!this.audio) return;
    const on = !this.state.soundOn;
    this.audio.setOn(on);
    this.state = { ...this.state, soundOn: on };
    this.emit();
  }

  // The HUD's minimap canvas — game draws to it each frame.
  setMinimapCanvas(c: HTMLCanvasElement | null): void {
    this.miniCanvas = c;
  }

  // The HUD's joystick element refs (mobile). No-op on desktop.
  wireJoystick(base: HTMLElement, knob: HTMLElement): void {
    this.input.wireJoystick(base, knob);
  }

  // ---- private helpers ----

  private emit(): void {
    this.subs.forEach((cb) => cb(this.state));
  }

  private markVisited(island: Island): void {
    if (this.state.visited[island.id]) return; // already discovered, no toast
    const visited = { ...this.state.visited, [island.id]: true };
    try {
      localStorage.setItem(VISITED_STORAGE_KEY, JSON.stringify(Object.keys(visited)));
    } catch {
      /* noop */
    }
    const all = Object.keys(visited).length >= this.islands.length;
    this.state = {
      ...this.state,
      visited,
      achievement: {
        title: all ? 'Explorer — every island found!' : island.title,
        all,
      },
    };
    this.emit();

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.state = { ...this.state, achievement: null };
      this.emit();
    }, 3000);
  }

  private updateDockState(): void {
    if (!this.boat) return;
    let nearest: Island | null = null;
    let nd = Infinity;
    for (const is of this.islands) {
      const d = this.boat.group.position.distanceTo(is.dock);
      if (d < nd) {
        nd = d;
        nearest = is;
      }
    }
    const cand = nearest && nd < DOCK_RANGE ? nearest : null;
    const candId = cand ? cand.id : '_none_';
    if (candId !== this.promptId) {
      this.promptId = candId;
      // Only surface the prompt change to React when there's no panel open —
      // the prompt is hidden behind an open panel anyway.
      if (!this.state.activePanel) {
        this.state = {
          ...this.state,
          dockTarget: cand
            ? { id: cand.id, title: cand.title, panel: cand.panel }
            : null,
        };
        this.emit();
      }
    }
    // Auto-close: sailing away from an active dock closes its panel.
    if (this.state.activePanel) {
      const active = this.islands.find((i) => i.panel === this.state.activePanel);
      if (active && this.boat.group.position.distanceTo(active.dock) > AUTO_CLOSE_RANGE) {
        this.closePanel();
      }
    }
  }

  private updateFoam(dt: number, fx: number, fz: number): void {
    if (!this.boat || !this.foamGeo || !this.sceneBundle) return;
    this.foamT += dt;
    // Foam is a per-frame allocator hotspot — spawning a fresh mesh + material
    // every 80ms (the prototype's rate) with MeshStandardMaterial caused
    // visible jank. Spawn slower (every 150ms), shorter lifetime (0.9s), and
    // use MeshBasicMaterial since foam doesn't need lighting.
    const FOAM_SPAWN_INTERVAL = 0.15;
    const FOAM_LIFETIME = 0.9;

    if (Math.abs(this.speed) > 4 && this.foamT > FOAM_SPAWN_INTERVAL) {
      this.foamT = 0;
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const f = new THREE.Mesh(this.foamGeo, mat);
      f.position.set(
        this.boat.group.position.x - fx * 3,
        0.35,
        this.boat.group.position.z - fz * 3,
      );
      f.scale.setScalar(0.6);
      this.sceneBundle.scene.add(f);
      this.foams.push({ mesh: f, life: 0 });
    }
    // Age + cleanup.
    for (let i = this.foams.length - 1; i >= 0; i--) {
      const fo = this.foams[i];
      fo.life += dt;
      fo.mesh.scale.setScalar(0.6 + fo.life * 2.4);
      (fo.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        0.7 * (1 - fo.life / FOAM_LIFETIME),
      );
      if (fo.life > FOAM_LIFETIME) {
        this.sceneBundle.scene.remove(fo.mesh);
        (fo.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.foams.splice(i, 1);
      }
    }
  }

  // Autopilot home: returns input overrides until close enough to disengage.
  private autopilotInput(): { throttle: number; turn: number } | null {
    if (!this.autopilot || !this.boat || this.islands.length === 0) return null;
    const home = this.islands[0]; // buildAllIslands puts home at index 0
    const dir = home.dock.clone().sub(this.boat.group.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 18) {
      this.autopilot = false;
      return null;
    }
    dir.normalize();
    const target = Math.atan2(-dir.x, -dir.z);
    let diff = target - this.boatAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return {
      throttle: 0.9,
      turn: Math.max(-1, Math.min(1, diff * 1.6)),
    };
  }

  private updateLabels(t: number): void {
    if (!this.boat) return;
    for (const is of this.islands) {
      if (!is.label) continue;
      const d = this.boat.group.position.distanceTo(is.pos);
      // Fade out beyond ~95 units past the 90-unit "near" radius.
      const op = Math.max(0, Math.min(1, (185 - d) / 95));
      is.label.material.opacity = op;
      is.label.visible = op > 0.02;
      is.label.position.y =
        is.labelY +
        Math.sin(t * 1.4 + is.pos.x * 0.1) * (this.reduced ? 0.12 : 0.6);
    }
  }

  private updateClouds(dt: number): void {
    for (const c of this.clouds) {
      c.position.x += dt * (this.reduced ? 0.6 : 1.8);
      if (c.position.x > 250) c.position.x = -250;
    }
  }

  private updateBirds(dt: number, t: number): void {
    for (const b of this.birds) {
      const u = b.userData as BirdData;
      u.a += dt * u.sp;
      b.position.set(u.cx + Math.cos(u.a) * u.r, u.y, u.cz + Math.sin(u.a) * u.r);
      b.rotation.y = -u.a + Math.PI / 2;
      const flap = Math.sin(t * 6 + u.a * 4) * 0.45;
      if (b.children[0]) b.children[0].rotation.z = 0.32 + flap;
      if (b.children[1]) b.children[1].rotation.z = -0.32 - flap;
    }
  }

  private drawMinimap(): void {
    const c = this.miniCanvas;
    if (!c || !this.boat) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b3a66';
    ctx.fillRect(0, 0, W, H);

    const range = 200;
    const sc = (W / 2 - 8) / range;
    const cx = W / 2;
    const cy = H / 2;

    // crosshair
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 6);
    ctx.lineTo(cx, H - 6);
    ctx.moveTo(6, cy);
    ctx.lineTo(W - 6, cy);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = 'bold 11px Nunito,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 13);

    // islands — visited get a gold ring
    for (const is of this.islands) {
      let x = cx + is.pos.x * sc;
      let y = cy + is.pos.z * sc;
      x = Math.max(8, Math.min(W - 8, x));
      y = Math.max(8, Math.min(H - 8, y));
      const seen = !!this.state.visited[is.id];
      ctx.globalAlpha = seen ? 1 : 0.4;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, 7);
      ctx.fillStyle = is.mini;
      ctx.fill();
      ctx.strokeStyle = seen ? '#ffd43b' : '#fff';
      ctx.lineWidth = seen ? 2.5 : 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // boat arrow
    const bx = Math.max(8, Math.min(W - 8, cx + this.boat.group.position.x * sc));
    const by = Math.max(8, Math.min(H - 8, cy + this.boat.group.position.z * sc));
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(this.boatAngle);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#1c7ed6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ---- main loop ----

  private animate = (): void => {
    if (!this.sceneBundle || !this.boat || !this.water) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    // Input — autopilot can override throttle/turn.
    let { throttle, turn } = this.input.read();
    const auto = this.autopilotInput();
    if (auto) {
      throttle = auto.throttle;
      turn = auto.turn;
    }

    // Motion model from the prototype.
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

    this.speed = collideBoat(boatGroup.position, this.islands, this.speed);
    boatGroup.rotation.y = this.boatAngle;

    // Bob + bank + pitch.
    const bobAmt = this.reduced ? 0.05 : 0.18;
    const model = this.boat.model;
    model.position.y = Math.sin(t * 2.2) * bobAmt;
    const targetBank = -turn * 0.16;
    model.rotation.z += (targetBank - model.rotation.z) * Math.min(1, dt * 6);
    model.rotation.x = Math.sin(t * 1.7) * bobAmt * 0.4 - this.speed * 0.004;

    this.water.update(dt);

    for (const is of this.islands) is.tick?.(dt, t, this.reduced);

    this.updateFoam(dt, fx, fz);
    this.updateClouds(dt);
    this.updateBirds(dt, t);
    this.updateLabels(t);
    this.updateDockState();

    // ---- camera follow / arc-when-docked ----
    const camera = this.sceneBundle.camera;
    const activeIsland = this.state.activePanel
      ? this.islands.find((i) => i.panel === this.state.activePanel)
      : null;
    let desired: THREE.Vector3;
    let lookT: THREE.Vector3;
    let camF: number;
    if (activeIsland) {
      // Arc behind the boat-relative-to-island so the camera frames the
      // island with the boat in the foreground.
      const toB = new THREE.Vector3().subVectors(boatGroup.position, activeIsland.pos);
      toB.y = 0;
      if (toB.lengthSq() < 0.01) toB.set(0, 0, 1);
      toB.normalize();
      desired = new THREE.Vector3(
        activeIsland.pos.x + toB.x * 64,
        58,
        activeIsland.pos.z + toB.z * 64,
      );
      lookT = new THREE.Vector3(activeIsland.pos.x, 9, activeIsland.pos.z);
      camF = Math.min(1, dt * 1.8);
    } else {
      const dist = 86;
      const height = 48;
      desired = new THREE.Vector3(
        boatGroup.position.x - fx * dist,
        height,
        boatGroup.position.z - fz * dist,
      );
      lookT = new THREE.Vector3(
        boatGroup.position.x + fx * 12,
        3.0,
        boatGroup.position.z + fz * 12,
      );
      camF = this.reduced ? Math.min(1, dt * 2) : Math.min(1, dt * 3.4);
    }
    camera.position.lerp(desired, camF);
    this.cameraLook.lerp(lookT, camF);
    camera.lookAt(this.cameraLook);

    this.drawMinimap();

    this.sceneBundle.renderer.render(this.sceneBundle.scene, camera);
    this.raf = requestAnimationFrame(this.animate);
  };
}
