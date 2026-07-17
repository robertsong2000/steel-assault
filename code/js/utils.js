// ===================== 通用工具 & 绘图辅助 =====================
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const chance = (p) => Math.random() < p;
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
  ctx.font = `${weight} ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, x, y);
}
// 描边大字
export function bigText(ctx, str, x, y, size, color, stroke = '#000') {
  ctx.font = `900 ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 12);
  ctx.strokeStyle = stroke;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}
