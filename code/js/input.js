// ===================== 键盘/手柄输入 & 科乐美秘技彩蛋 =====================
import { loadSave, saveGame } from './utils.js';

const DEFAULT_KEYS = {
  left:  ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up:    ['ArrowUp', 'KeyW'],
  down:  ['ArrowDown', 'KeyS'],
  shoot: ['KeyF'],
  jump:  ['KeyX', 'KeyK', 'Space'],
  start: ['Enter', 'KeyP'],
  mute:  ['KeyM'],
  settings: ['KeyO'],
  challenge: ['KeyC'],
};
export const ACTION_KEYS = JSON.parse(JSON.stringify(DEFAULT_KEYS));

// 启动时加载自定义键位（JSON，损坏数据/隐私模式回退默认）
try {
  const saved = loadSave().keybinds;
  if (saved) {
    for (const a in ACTION_KEYS) {
      if (Array.isArray(saved[a]) && saved[a].length && saved[a].every((c) => typeof c === 'string')) {
        ACTION_KEYS[a] = saved[a];
      }
    }
  }
} catch { /* 忽略：使用默认键位 */ }

export function saveKeybinds() { saveGame((save) => { save.keybinds = ACTION_KEYS; }); }
export function resetKeybinds() {
  for (const a in DEFAULT_KEYS) ACTION_KEYS[a] = [...DEFAULT_KEYS[a]];
  saveKeybinds();
}
// 重绑：替换该动作的主键（数组第一个）；同键先从其他动作数组移除，防两个动作共用一个键
export function rebindKey(action, code) {
  if (!ACTION_KEYS[action]) return;
  for (const a in ACTION_KEYS) {
    if (a !== action) ACTION_KEYS[a] = ACTION_KEYS[a].filter((c) => c !== code);
  }
  ACTION_KEYS[action][0] = code;
  saveKeybinds();
}

// code → 友好短名（设置界面显示用）
const KEY_NAMES = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Space: '空格', Enter: '回车', Escape: 'ESC', Tab: 'Tab', Backspace: '退格',
  ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
  AltLeft: 'Alt', AltRight: 'Alt',
};
export function keyName(code) {
  if (!code) return '—';   // 主键被重绑冲突腾空时的占位显示
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  return code;
}

const PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

// ---- 手柄（Gamepad 标准映射）----
const PAD_DEAD = 0.35;   // 摇杆死区
// 按钮号 → 动作：十字键=方向 A=跳 B/X=射击 Start=开始 Select=设置 RB=静音
const PAD_BTNS = {
  12: 'up', 13: 'down', 14: 'left', 15: 'right',
  0: 'jump', 1: 'shoot', 2: 'shoot', 9: 'start', 8: 'settings', 5: 'mute',
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.virtual = new Set();   // 触屏虚拟按键
    this.padDown = new Set();    // 手柄按住的动作
    this.padPressed = new Set(); // 手柄本帧按下（边沿，仅持续一帧）
    this.gamepadCount = 0;
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
    window.addEventListener('blur', () => this.clear());
    window.addEventListener('gamepaddisconnected', () => { this.padDown.clear(); this.padPressed.clear(); this.gamepadCount = 0; });
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

  // 每帧轮询手柄，注入动作层语义（与触屏一致：不触发科乐美追踪）
  pollGamepad() {
    this.padPressed.clear();
    this.gamepadCount = 0;
    const next = new Set();
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      for (const gp of navigator.getGamepads()) {
        if (!gp || !gp.connected) continue;
        this.gamepadCount++;
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (ax < -PAD_DEAD) next.add('left');
        if (ax > PAD_DEAD) next.add('right');
        if (ay < -PAD_DEAD) next.add('up');
        if (ay > PAD_DEAD) next.add('down');
        for (const i in PAD_BTNS) {
          if (gp.buttons[i] && gp.buttons[i].pressed) next.add(PAD_BTNS[i]);
        }
      }
    }
    for (const a of next) if (!this.padDown.has(a)) this.padPressed.add(a);
    this.padDown = next;
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
  clear() {
    this.down.clear();
    this.pressed.clear();
    this.virtual.clear();
    this.padDown.clear();
    this.padPressed.clear();
  }

  isDown(action) {
    return this.padDown.has(action)
      || ACTION_KEYS[action].some((c) => this.down.has(c) || this.virtual.has(c));
  }
  wasPressed(action) {
    return this.padPressed.has(action)
      || ACTION_KEYS[action].some((c) => this.pressed.has(c));
  }
  endFrame() {
    this.pressed.clear();
    this.padPressed.clear();
  }
}
