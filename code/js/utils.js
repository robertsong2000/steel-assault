// ===================== 通用工具 & 绘图辅助 =====================
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const chance = (p) => Math.random() < p;
export function seededRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
export const ACCESSIBILITY = { shake: true, flashes: true, particles: 'high', textScale: 1, contrast: false };
export function setAccessibility(options = {}) { Object.assign(ACCESSIBILITY, options); }

// 存档：单一版本化对象；首次读取时兼容旧版分散 localStorage key。
const SAVE_KEY = 'steel_assault_save';
const SAVE_VERSION = 1;
const freshSave = () => ({
  version: SAVE_VERSION,
  hi: 0,
  difficulty: 1,
  unlocked: 0,
  audio: { master: 100, sfx: 100, bgm: 100 },
  keybinds: null,
  accessibility: { shake: true, flashes: true, particles: 'high', textScale: 1, contrast: false },
});

const safeGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* 隐私模式等环境忽略写入失败 */ } };
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

export function loadSave() {
  const fallback = freshSave();
  try {
    const parsed = JSON.parse(safeGet(SAVE_KEY) || 'null');
    if (parsed && typeof parsed === 'object' && parsed.version === SAVE_VERSION) {
      return {
        ...fallback, ...parsed,
        hi: finite(+parsed.hi, fallback.hi),
        difficulty: finite(+parsed.difficulty, fallback.difficulty),
        unlocked: finite(+parsed.unlocked, fallback.unlocked),
        audio: { ...fallback.audio, ...(parsed.audio || {}) },
        accessibility: { ...fallback.accessibility, ...(parsed.accessibility || {}) },
      };
    }
  } catch { /* 损坏数据迁移旧键或回退默认 */ }
  const legacyKeys = JSON.parse(safeGet('steel_assault_keys') || 'null');
  const migrated = {
    ...fallback,
    hi: finite(+safeGet('steel_assault_hi'), 0),
    difficulty: finite(+safeGet('steel_assault_diff'), 1),
    unlocked: finite(+safeGet('steel_assault_unlocked'), 0),
    audio: {
      master: loadNum('steel_assault_vol_master', 100),
      sfx: loadNum('steel_assault_vol_sfx', 100),
      bgm: loadNum('steel_assault_vol_bgm', 100),
    },
    keybinds: legacyKeys,
  };
  saveGame((save) => Object.assign(save, migrated));
  return migrated;
}

export function saveGame(mutator) {
  const save = (() => {
    try {
      const parsed = JSON.parse(safeGet(SAVE_KEY) || 'null');
      return parsed && parsed.version === SAVE_VERSION ? { ...freshSave(), ...parsed, audio: { ...freshSave().audio, ...(parsed.audio || {}) }, accessibility: { ...freshSave().accessibility, ...(parsed.accessibility || {}) } } : freshSave();
    } catch { return freshSave(); }
  })();
  mutator(save);
  save.version = SAVE_VERSION;
  safeSet(SAVE_KEY, JSON.stringify(save));
  return save;
}

export function resetGameSave() {
  const save = freshSave();
  safeSet(SAVE_KEY, JSON.stringify(save));
  return save;
}

// 兼容旧调用的安全数值读写：新代码应优先使用 loadSave/saveGame。
export function loadNum(key, fallback = 0) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = +raw;
    return Number.isFinite(v) ? v : fallback;
  } catch { return fallback; }
}
export function saveVal(key, val) {
  try { localStorage.setItem(key, String(val)); } catch { /* 隐私模式等环境忽略写入失败 */ }
}
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const pointInRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const circleRect = (cx, cy, cr, r) => {
  const nx = clamp(cx, r.x, r.x + r.w), ny = clamp(cy, r.y, r.y + r.h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
};
// 由坐标决定的确定性伪随机（地形噪点用，避免闪烁）
export const hash01 = (x, y = 0) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// AABB 物理移动：先水平后垂直，支持单向平台（oneways 只在下落且上一帧脚在平台上方时落脚）
export function physicsMove(ent, solids, oneways, dt) {
  ent.onGround = false;
  // 水平
  ent.x += ent.vx * dt;
  for (const s of solids) {
    if (overlap(ent, s)) {
      if (ent.vx > 0) ent.x = s.x - ent.w;
      else if (ent.vx < 0) ent.x = s.x + s.w;
      ent.hitWall = true;
    }
  }
  // 垂直
  const prevBottom = ent.y + ent.h;
  ent.y += ent.vy * dt;
  for (const s of solids) {
    if (overlap(ent, s)) {
      if (ent.vy > 0) { ent.y = s.y - ent.h; ent.onGround = true; }
      else if (ent.vy < 0) { ent.y = s.y + s.h; }
      ent.vy = 0;
    }
  }
  if (ent.vy >= 0) {
    for (const p of oneways) {
      if (p.gone) continue;   // 塌陷平台：消失期间无碰撞
      if (prevBottom <= p.y + 2 && overlap(ent, p)) {
        ent.y = p.y - ent.h;
        ent.onGround = true;
        ent.vy = 0;
      }
    }
  }
}

// ---- 绘图辅助 ----
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function text(ctx, str, x, y, { size = 20, color = '#fff', align = 'left', weight = 'bold' } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${Math.round(size * ACCESSIBILITY.textScale)}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, x, y);
}
// 描边大字
export function bigText(ctx, str, x, y, size, color, stroke = '#000') {
  ctx.font = `900 ${Math.round(size * ACCESSIBILITY.textScale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 12);
  ctx.strokeStyle = stroke;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
