// ===================== 键盘输入 & 科乐美秘技彩蛋 =====================
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

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.virtual = new Set();   // 触屏虚拟按键
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
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) {
        this.pressed.add(e.code);
        this.trackKonami(e.code);
        // 简单金手指：标题画面直接按 9 获得 30 条命
        if ((e.code === 'Digit9' || e.code === 'Numpad9') && this.onKonami) this.onKonami();
      }
      this.down.add(e.code);
      if (PREVENT.has(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
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

  isDown(action) {
    return (this.keys[action] || []).some((c) => this.down.has(c) || this.virtual.has(c));
  }
  wasPressed(action) {
    return (this.keys[action] || []).some((c) => this.pressed.has(c));
  }
  endFrame() {
    this.pressed.clear();
  }
}
