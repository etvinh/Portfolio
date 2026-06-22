// Keyboard + joystick input → normalized throttle/turn in [-1, 1]. The game
// loop polls read() each frame; subscribers to "dock key pressed" wire up via
// onDock(). Lifecycle: start() attaches listeners, stop() cleans them up.

export type InputState = { throttle: number; turn: number };

export class InputManager {
  private keys: Record<string, boolean> = {};
  private joy = { x: 0, y: 0 };
  private dockHandlers = new Set<() => void>();
  private joyKnob: HTMLElement | null = null;
  private joyBaseListenerAdded = false;

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys[k] = true;
    if (k === 'e') this.dockHandlers.forEach((cb) => cb());
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  start(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  stop(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.dockHandlers.clear();
    this.keys = {};
    this.joy = { x: 0, y: 0 };
  }

  read(): InputState {
    const k = this.keys;
    let throttle = 0;
    let turn = 0;
    if (k['w'] || k['arrowup']) throttle += 1;
    if (k['s'] || k['arrowdown']) throttle -= 0.7;
    if (k['a'] || k['arrowleft']) turn -= 1;
    if (k['d'] || k['arrowright']) turn += 1;
    throttle += -this.joy.y;
    turn += this.joy.x;
    return {
      throttle: Math.max(-1, Math.min(1, throttle)),
      turn: Math.max(-1, Math.min(1, turn)),
    };
  }

  onDock(cb: () => void): () => void {
    this.dockHandlers.add(cb);
    return () => this.dockHandlers.delete(cb);
  }

  wireJoystick(base: HTMLElement, knob: HTMLElement): void {
    if (this.joyBaseListenerAdded) return;
    this.joyBaseListenerAdded = true;
    this.joyKnob = knob;

    const reset = () => {
      this.joy.x = 0;
      this.joy.y = 0;
      if (this.joyKnob) this.joyKnob.style.transform = 'translate(0,0)';
    };

    const move = (e: PointerEvent) => {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = r.width / 2 - 8;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.joy.x = dx / max;
      this.joy.y = dy / max;
      if (this.joyKnob) this.joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
    };

    base.addEventListener('pointerdown', (e) => {
      base.setPointerCapture(e.pointerId);
      move(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.buttons || e.pressure) move(e);
    });
    base.addEventListener('pointerup', reset);
    base.addEventListener('pointercancel', reset);
    base.addEventListener('lostpointercapture', reset);
  }
}
