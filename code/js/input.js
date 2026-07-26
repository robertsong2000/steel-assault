// ===================== 键盘输入 & 科乐美秘技彩蛋 =====================
const ACTION_KEYS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up:    ['ArrowUp', 'KeyW'],
  down:  ['ArrowDown', 'KeyS'],
  shoot: ['KeyF'],
  jump:  ['KeyX', 'KeyK', 'Space'],
  start: ['Enter', 'KeyP'],
  mute:  ['KeyM'],
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
    return ACTION_KEYS[action].some((c) => this.down.has(c) || this.virtual.has(c));
  }
  wasPressed(action) {
    return ACTION_KEYS[action].some((c) => this.pressed.has(c));
  }
  endFrame() {
    this.pressed.clear();
  }
}
