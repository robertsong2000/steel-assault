// ===================== 键盘输入 & 科乐美秘技彩蛋 & 手柄 & 可改键 =====================
export const DEFAULT_ACTION_KEYS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up:    ['ArrowUp', 'KeyW'],
  down:  ['ArrowDown', 'KeyS'],
  shoot: ['KeyF'],
  jump:  ['KeyX', 'KeyK', 'Space'],
  start: ['Enter', 'KeyP'],
  mute:  ['KeyM'],
  settings: ['Escape', 'KeyO'],
};
const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

/** Standard mapping: ignore stick noise below this |axis| (inclusive). */
export const GAMEPAD_DEADZONE = 0.25;

export function axisToDir(axis, deadzone = GAMEPAD_DEADZONE) {
  const v = Number(axis);
  if (!Number.isFinite(v)) return 0;
  if (Math.abs(v) <= deadzone) return 0;
  return v > 0 ? 1 : -1;
}

function buttonOn(buttons, index) {
  const b = buttons?.[index];
  if (b == null) return false;
  if (typeof b === 'object') {
    if (b.pressed) return true;
    return typeof b.value === 'number' && b.value >= 0.5;
  }
  return !!b;
}

const EMPTY_ACTIONS = Object.freeze({
  left: false, right: false, up: false, down: false,
  jump: false, shoot: false, start: false, mute: false, settings: false,
});

/** Map a W3C standard-mapping Gamepad snapshot to named actions. */
export function readGamepadActions(gp) {
  const actions = { ...EMPTY_ACTIONS };
  if (!gp || gp.connected === false) return actions;
  const buttons = gp.buttons || [];
  const axes = gp.axes || [];
  const ax = axisToDir(axes[0]);
  const ay = axisToDir(axes[1]);
  if (ax < 0 || buttonOn(buttons, 14)) actions.left = true;
  if (ax > 0 || buttonOn(buttons, 15)) actions.right = true;
  if (ay < 0 || buttonOn(buttons, 12)) actions.up = true;
  if (ay > 0 || buttonOn(buttons, 13)) actions.down = true;
  if (buttonOn(buttons, 0)) actions.jump = true;                 // A / Cross
  if (buttonOn(buttons, 2) || buttonOn(buttons, 5) || buttonOn(buttons, 7)) {
    actions.shoot = true;                                        // X / RB / RT
  }
  if (buttonOn(buttons, 9)) actions.start = true;                // Start
  if (buttonOn(buttons, 8)) actions.mute = true;                 // Select / Back
  return actions;
}

/** First connected pad; skips empty getGamepads() slots. */
export function pickGamepad(pads) {
  if (!pads) return null;
  for (const gp of pads) {
    if (gp && gp.connected !== false) return gp;
  }
  return null;
}

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.virtual = new Set();   // 触屏虚拟按键
    this.gamepadDown = new Set();
    this.gamepadPressed = new Set();
    this.konamiIdx = 0;
    this.onKonami = null;
    this.keys = {
      left: [...DEFAULT_ACTION_KEYS.left],
      right: [...DEFAULT_ACTION_KEYS.right],
      up: [...DEFAULT_ACTION_KEYS.up],
      down: [...DEFAULT_ACTION_KEYS.down],
      shoot: [...DEFAULT_ACTION_KEYS.shoot],
      jump: [...DEFAULT_ACTION_KEYS.jump],
      start: [...DEFAULT_ACTION_KEYS.start],
      mute: [...DEFAULT_ACTION_KEYS.mute],
      settings: [...DEFAULT_ACTION_KEYS.settings],
    };
    const win = typeof window !== 'undefined' ? window : null;
    if (!win?.addEventListener) return;
    win.addEventListener('keydown', (e) => {
      if (!e.repeat) {
        this.pressed.add(e.code);
        this.trackKonami(e.code);
        // 简单金手指：标题画面直接按 9 获得 30 条命
        if ((e.code === 'Digit9' || e.code === 'Numpad9') && this.onKonami) this.onKonami();
      }
      this.down.add(e.code);
      if (PREVENT.has(e.code)) e.preventDefault();
    });
    win.addEventListener('keyup', (e) => this.down.delete(e.code));
    win.addEventListener('blur', () => this.down.clear());
  }

  setBindings({ shoot, jump } = {}) {
    if (shoot) this.keys.shoot = Array.isArray(shoot) ? [...shoot] : [shoot];
    if (jump) this.keys.jump = Array.isArray(jump) ? [...jump] : [jump];
  }

  trackKonami(code) {
    if (code === KONAMI[this.konamiIdx]) {
      this.konamiIdx++;
      if (this.konamiIdx === KONAMI.length) {
        this.konamiIdx = 0;
        if (this.onKonami) this.onKonami();
      }
    } else {
      this.konamiIdx = code === KONAMI[0] ? 1 : 0;
    }
  }

  // 触屏虚拟按键（不走科乐美追踪）
  virtualDown(code) {
    if (!this.virtual.has(code)) {
      this.pressed.add(code);
      // 简单金手指：触屏按 30 同样生效
      if ((code === 'Digit9' || code === 'Numpad9') && this.onKonami) this.onKonami();
    }
    this.virtual.add(code);
  }
  virtualUp(code) {
    this.virtual.delete(code);
  }
  virtualClear() {
    this.virtual.clear();
  }

  /**
   * Poll Gamepad API. Pass a snapshot (tests) or omit to read navigator.getGamepads().
   * Must run once per sim frame before isDown / wasPressed.
   */
  pollGamepad(list) {
    let pads = list;
    if (pads === undefined) {
      try {
        pads = (typeof navigator !== 'undefined' && navigator.getGamepads?.()) || [];
      } catch {
        pads = [];
      }
    }
    const actions = readGamepadActions(pickGamepad(pads));
    const next = new Set();
    for (const [name, on] of Object.entries(actions)) {
      if (on) next.add(name);
    }
    this.gamepadPressed.clear();
    for (const name of next) {
      if (!this.gamepadDown.has(name)) this.gamepadPressed.add(name);
    }
    this.gamepadDown = next;
  }

  isDown(action) {
    return (this.keys[action] || []).some((c) => this.down.has(c) || this.virtual.has(c))
      || this.gamepadDown.has(action);
  }
  wasPressed(action) {
    return (this.keys[action] || []).some((c) => this.pressed.has(c))
      || this.gamepadPressed.has(action);
  }
  endFrame() {
    this.pressed.clear();
    this.gamepadPressed.clear();
  }
}
