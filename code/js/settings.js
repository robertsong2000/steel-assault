// ===================== 设置：主音量 + 射击/跳跃键位（可持久化） =====================
import { clamp, loadNum, saveVal } from './utils.js';

export const VOLUME_KEY = 'steel_assault_vol';
export const SHOOT_KEY = 'steel_assault_key_shoot';
export const JUMP_KEY = 'steel_assault_key_jump';

export const DEFAULT_SETTINGS = {
  volume: 0.45,
  shoot: 'KeyF',
  jump: 'KeyX',
};

export const SETTINGS_ROWS = ['volume', 'shoot', 'jump'];
export const VOLUME_STEP = 0.05;

const RESERVED_CODES = new Set([
  'Enter', 'Escape', 'KeyO', 'KeyP', 'KeyM',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyA', 'KeyD', 'KeyW', 'KeyS',
]);

export function clampVolume(v) {
  const n = typeof v === 'number' ? v : +v;
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.volume;
  return clamp(n, 0, 1);
}

export function nudgeVolume(vol, dir) {
  const stepped = Math.round((clampVolume(vol) + Math.sign(dir) * VOLUME_STEP) * 20) / 20;
  return clamp(stepped, 0, 1);
}

export function isBindableCode(code) {
  if (typeof code !== 'string') return false;
  if (RESERVED_CODES.has(code)) return false;
  if (code === 'Space') return true;
  if (/^Key[A-Z]$/.test(code)) return true;
  if (/^Digit[0-9]$/.test(code)) return true;
  return false;
}

export function keyLabel(code) {
  if (code === 'Space') return 'SPACE';
  if (typeof code === 'string' && /^Key[A-Z]$/.test(code)) return code.slice(3);
  if (typeof code === 'string' && /^Digit[0-9]$/.test(code)) return code.slice(5);
  return code || '';
}

function loadStr(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return fallback;
    return String(raw);
  } catch {
    return fallback;
  }
}

export function loadSettings() {
  const volume = clampVolume(loadNum(VOLUME_KEY, DEFAULT_SETTINGS.volume));
  const shootRaw = loadStr(SHOOT_KEY, DEFAULT_SETTINGS.shoot);
  const jumpRaw = loadStr(JUMP_KEY, DEFAULT_SETTINGS.jump);
  return {
    volume,
    shoot: isBindableCode(shootRaw) ? shootRaw : DEFAULT_SETTINGS.shoot,
    jump: isBindableCode(jumpRaw) ? jumpRaw : DEFAULT_SETTINGS.jump,
  };
}

export function saveSettings(partial = {}) {
  const next = { ...loadSettings() };
  if ('volume' in partial && typeof partial.volume === 'number' && Number.isFinite(partial.volume)) {
    next.volume = clampVolume(partial.volume);
  }
  if ('shoot' in partial && isBindableCode(partial.shoot) && partial.shoot !== next.jump) {
    next.shoot = partial.shoot;
  }
  if ('jump' in partial && isBindableCode(partial.jump) && partial.jump !== next.shoot) {
    next.jump = partial.jump;
  }
  saveVal(VOLUME_KEY, next.volume);
  saveVal(SHOOT_KEY, next.shoot);
  saveVal(JUMP_KEY, next.jump);
  return next;
}

export function bindAction(settings, action, code) {
  if (action !== 'shoot' && action !== 'jump') return settings;
  if (!isBindableCode(code)) return settings;
  if (action === 'shoot' && code === settings.jump) return settings;
  if (action === 'jump' && code === settings.shoot) return settings;
  return saveSettings({ [action]: code });
}

export function applyBindings(input, settings) {
  const shoot = [settings.shoot];
  const jump = [settings.jump];
  if (settings.jump !== 'Space') jump.push('Space');
  input.setBindings({ shoot, jump });
}
