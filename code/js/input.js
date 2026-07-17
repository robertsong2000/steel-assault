// ===================== 键盘输入 & 科乐美秘技彩蛋 =====================
const ACTION_KEYS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up:    ['ArrowUp', 'KeyW'],
  down:  ['ArrowDown', 'KeyS'],
  shoot: ['KeyZ', 'KeyJ'],
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
    this.konamiIdx = 0;
    this.onKonami = null;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) {
        this.pressed.add(e.code);
        this.trackKonami(e.code);
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

  isDown(action) {
    return ACTION_KEYS[action].some((c) => this.down.has(c));
  }
  wasPressed(action) {
    return ACTION_KEYS[action].some((c) => this.pressed.has(c));
  }
  endFrame() {
    this.pressed.clear();
  }
}
