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
/** 摇杆死区：|axis| 不超过该值视为归零（含边界） */
export const GAMEPAD_DEADZONE = 0.35;

/** 单轴 → 方向（-1/0/+1）；非数值按 0 处理 */
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
  jump: false, shoot: false, start: false, mute: false, settings: false, challenge: false,
});

/**
 * W3C 标准映射手柄快照 → 动作语义（纯函数，便于单测）。
 * 十字键=方向 A=跳 B/X/RB/RT=射击 Start=开始 Select=设置
 */
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
  if (buttonOn(buttons, 1) || buttonOn(buttons, 2) || buttonOn(buttons, 5) || buttonOn(buttons, 7)) {
    actions.shoot = true;                                        // B / X / RB / RT
  }
  if (buttonOn(buttons, 9)) actions.start = true;                // Start
  if (buttonOn(buttons, 8)) actions.settings = true;             // Select / Back
  return actions;
}

/** 取第一个已连接的手柄；跳过 getGamepads() 的空槽位 */
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
    this.virtual = new Set();     // 触屏虚拟按键
    this.padDown = new Set();     // 手柄按住的动作
    this.padPressed = new Set();  // 手柄本帧按下（边沿，仅持续一帧）
    this.gamepadCount = 0;
    this.konamiIdx = 0;
    this.onKonami = null;
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
    win.addEventListener('blur', () => this.clear());
    win.addEventListener('gamepaddisconnected', () => { this.padDown.clear(); this.padPressed.clear(); this.gamepadCount = 0; });
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

  /**
   * 每帧轮询手柄，注入动作层语义（与触屏一致：不触发科乐美追踪）。
   * 可传入快照数组（单测用），缺省读 navigator.getGamepads()。
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
    this.padPressed.clear();
    this.gamepadCount = 0;
    const next = new Set();
    for (const gp of pads || []) {
      if (!gp || gp.connected === false) continue;
      this.gamepadCount++;
      for (const [name, on] of Object.entries(readGamepadActions(gp))) {
        if (on) next.add(name);
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
      || (ACTION_KEYS[action] || []).some((c) => this.down.has(c) || this.virtual.has(c));
  }
  wasPressed(action) {
    return this.padPressed.has(action)
      || (ACTION_KEYS[action] || []).some((c) => this.pressed.has(c));
  }
  endFrame() {
    this.pressed.clear();
    this.padPressed.clear();
  }
}
