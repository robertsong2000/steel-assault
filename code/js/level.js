// ===================== 关卡数据 & 背景/地形绘制（原创布局） =====================
import { CFG } from './config.js';
import { rect, hash01 } from './utils.js';
import { Assets } from './assets.js';

const G = CFG.GROUND_Y; // 470

export const LEVEL = {
  width: CFG.LEVEL_W,
  // 实体地形（可站立、挡子弹）
  solids: [
    { x: 0,    y: G, w: 1200, h: 70, kind: 'ground' },
    { x: 1290, y: G, w: 860,  h: 70, kind: 'ground' },
    { x: 2260, y: G, w: 490,  h: 70, kind: 'ground' },
    { x: 3100, y: G, w: 550,  h: 70, kind: 'ground' },
    { x: 3750, y: G, w: 1550, h: 70, kind: 'ground' },
    { x: 2380, y: 390, w: 200, h: 80, kind: 'rock' },
    { x: CFG.ARENA_WALL_X, y: 0, w: CFG.LEVEL_W - CFG.ARENA_WALL_X, h: G, kind: 'wall' },
  ],
  // 单向平台（从下方可穿过）
  oneways: [
    { x: 640,  y: 360, w: 180, h: 14, kind: 'metal' },
    { x: 1320, y: 380, w: 140, h: 14, kind: 'metal' },
    { x: 1500, y: 290, w: 140, h: 14, kind: 'metal' },
    { x: 2430, y: 300, w: 120, h: 14, kind: 'metal' },
    { x: 2750, y: G,   w: 350, h: 14, kind: 'bridge' },
    { x: 3350, y: 360, w: 150, h: 14, kind: 'metal' },
    { x: 3820, y: 370, w: 140, h: 14, kind: 'metal' },
    { x: 3980, y: 280, w: 140, h: 14, kind: 'metal' },
    { x: 4560, y: 350, w: 190, h: 14, kind: 'metal' },
    { x: 4780, y: 250, w: 190, h: 14, kind: 'metal' },
  ],
  // 固定敌人（炮台/狙击手），x=中心, y=脚底
  turrets: [
    { x: 730,  y: 360 },
    { x: 2480, y: 390 },
    { x: 3960, y: G },
  ],
  snipers: [
    { x: 1700, y: G },
    { x: 3160, y: G },
    { x: 4120, y: G },
  ],
  // 刷兵触发线：镜头右缘越线即触发
  triggers: [
    { x: 500,  type: 'runners', n: 3, dir: -1 },
    { x: 950,  type: 'runners', n: 3, dir: -1 },
    { x: 1400, type: 'runners', n: 2, dir: 1 },
    { x: 1750, type: 'drone', carry: 'M' },
    { x: 2000, type: 'runners', n: 4, dir: -1 },
    { x: 2550, type: 'runners', n: 3, dir: -1 },
    { x: 2900, type: 'drone', carry: 'S' },
    { x: 3250, type: 'runners', n: 4, dir: -1 },
    { x: 3450, type: 'runners', n: 3, dir: 1 },
    { x: 3900, type: 'drone', carry: 'S' },
    { x: 4150, type: 'runners', n: 4, dir: -1 },
    { x: 4350, type: 'drone', carry: 'M' },
  ],
};

// 求某 x 处的落脚面高度（用于刷兵/重生），无地面返回 null
export function groundTopAt(x) {
  let best = null;
  for (const s of [...LEVEL.solids, ...LEVEL.oneways]) {
    if (x >= s.x && x <= s.x + s.w) {
      if (best === null || s.y < best) best = s.y;
    }
  }
  return best;
}

// ---------------- 背景（黄昏丛林，三层视差） ----------------
export function drawBackground(ctx, camX, t) {
  const sky = Assets.get('bg_sky');
  if (sky) {
    // 生成天空图：静态满屏
    ctx.drawImage(sky, 0, 0, CFG.W, CFG.H);
  } else {
    // 天空
    const grad = ctx.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, '#160b2e');
    grad.addColorStop(0.45, '#3d1b4e');
    grad.addColorStop(0.75, '#8a3550');
    grad.addColorStop(1, '#c9542f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 星星（随时间微闪）
    for (let i = 0; i < 60; i++) {
      const sx = hash01(i, 7) * CFG.W;
      const sy = hash01(i, 13) * 240;
      const tw = hash01(i, 29) > 0.5 ? Math.sin(t * 2 + i) * 0.4 + 0.6 : 0.8;
      ctx.globalAlpha = tw * (1 - sy / 300);
      ctx.fillStyle = '#ffe9d0';
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // 落日
    const sunX = 720 - camX * 0.04;
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.arc(sunX, 330, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffc46b';
    ctx.beginPath();
    ctx.arc(sunX, 330, 44, 0, Math.PI * 2);
    ctx.fill();
  }

  // 远山（视差 0.3）：生成图平铺 / 代码山脊回退
  const mt = Assets.get('bg_mountains');
  if (mt) {
    tileLayer(ctx, mt, camX * 0.3, CFG.GROUND_Y - 215, 215);
  } else {
    drawRidge(ctx, camX * 0.15, 330, 150, '#2a1440', 0.9);
    drawRidge(ctx, camX * 0.3, 400, 110, '#1d0f30', 1.4);
  }
  // 丛林（视差 0.55）
  const jg = Assets.get('bg_jungle');
  if (jg) {
    tileLayer(ctx, jg, camX * 0.55, CFG.GROUND_Y - 120, 120);
  } else {
    drawJungle(ctx, camX * 0.55);
  }
}

// 透明剪影层横向平铺
function tileLayer(ctx, img, offsetX, y, h) {
  const w = img.width * (h / img.height);
  let start = -(offsetX % w);
  if (start > 0) start -= w;
  for (let x = start; x < CFG.W; x += w) {
    ctx.drawImage(img, x, y, w, h);
  }
}

function drawRidge(ctx, off, baseY, amp, color, freq) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, CFG.H);
  for (let x = 0; x <= CFG.W; x += 8) {
    const wx = x + off;
    const y = baseY - Math.abs(Math.sin(wx * 0.004 * freq)) * amp - Math.sin(wx * 0.013) * 22;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CFG.W, CFG.H);
  ctx.closePath();
  ctx.fill();
}

function drawJungle(ctx, off) {
  ctx.fillStyle = '#0d1a12';
  ctx.fillRect(0, 440, CFG.W, CFG.H - 440);
  // 树冠团
  for (let i = -1; i < 14; i++) {
    const wx = i * 110 + (off % 110);
    const h = 46 + hash01(i + Math.floor(off / 110), 3) * 40;
    ctx.beginPath();
    ctx.arc(wx, 446 - h * 0.3, h, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------- 地形绘制 ----------------
export function drawTerrain(ctx, camX, t) {
  for (const s of LEVEL.solids) {
    if (s.x + s.w < camX - 20 || s.x > camX + CFG.W + 20) continue;
    if (s.kind === 'ground') drawGround(ctx, s);
    else if (s.kind === 'rock') drawRock(ctx, s);
    else if (s.kind === 'wall') drawWall(ctx, s);
  }
  for (const p of LEVEL.oneways) {
    if (p.x + p.w < camX - 20 || p.x > camX + CFG.W + 20) continue;
    if (p.kind === 'bridge') drawBridge(ctx, p, t);
    else drawMetal(ctx, p);
  }
  // 坑底水面
  drawWater(ctx, camX, t, 1200, 1290);
  drawWater(ctx, camX, t, 2150, 2260);
  drawWater(ctx, camX, t, 2750, 3100);
  drawWater(ctx, camX, t, 3650, 3750);
}

function drawGround(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_ground');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.25)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#4a2f1d');
  rect(ctx, s.x, s.y, s.w, 10, '#3f7a35');
  rect(ctx, s.x, s.y + 10, s.w, 4, '#5a3b24');
  // 草丛与土块噪点（坐标哈希，静止不闪）
  for (let x = s.x; x < s.x + s.w; x += 18) {
    if (hash01(x, s.y) > 0.55) rect(ctx, x, s.y - 6, 4, 6, '#4f9440');
    if (hash01(x, 99) > 0.6) rect(ctx, x + 6, s.y + 24 + hash01(x, 5) * 30, 5, 4, '#3a2415');
  }
}

function drawRock(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_rock');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, s.w, 3, 'rgba(255,255,255,0.2)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#5c5a66');
  rect(ctx, s.x, s.y, s.w, 8, '#7d7b8a');
  for (let x = s.x + 6; x < s.x + s.w - 6; x += 16) {
    for (let y = s.y + 14; y < s.y + s.h - 6; y += 14) {
      if (hash01(x, y) > 0.5) rect(ctx, x, y, 6, 5, '#494753');
    }
  }
}

function drawWall(ctx, s) {
  const pat = Assets.pattern(ctx, 'tile_metal');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    rect(ctx, s.x, s.y, 6, s.h, 'rgba(255,255,255,0.15)');
    return;
  }
  rect(ctx, s.x, s.y, s.w, s.h, '#31323e');
  rect(ctx, s.x, s.y, 8, s.h, '#4a4b5c');
  for (let y = 20; y < s.h - 10; y += 46) {
    rect(ctx, s.x + 10, y, 6, 6, '#555668');
  }
}

function drawMetal(ctx, p) {
  const pat = Assets.pattern(ctx, 'tile_metal');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    rect(ctx, p.x, p.y, p.w, 3, 'rgba(255,255,255,0.35)');
    return;
  }
  rect(ctx, p.x, p.y, p.w, p.h, '#6e7488');
  rect(ctx, p.x, p.y, p.w, 4, '#9aa0b5');
  for (let x = p.x + 8; x < p.x + p.w - 4; x += 24) {
    rect(ctx, x, p.y + 7, 4, 4, '#3f4352');
  }
}

function drawBridge(ctx, p, t) {
  const pat = Assets.pattern(ctx, 'tile_bridge');
  if (pat) {
    ctx.save();
    ctx.beginPath();
    for (let x = p.x; x <= p.x + p.w; x += 10) {
      const sag = Math.sin((x - p.x) / p.w * Math.PI) * 10;
      if (x === p.x) ctx.moveTo(x, p.y + sag - 4);
      else ctx.lineTo(x, p.y + sag - 4);
    }
    ctx.lineTo(p.x + p.w, p.y + 20);
    ctx.lineTo(p.x, p.y + 20);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = pat;
    ctx.fillRect(p.x, p.y - 6, p.w, 30);
    ctx.restore();
    return;
  }
  // 吊桥：木板 + 绳索
  for (let x = p.x; x < p.x + p.w; x += 22) {
    const sag = Math.sin((x - p.x) / p.w * Math.PI) * 10;
    rect(ctx, x, p.y + sag, 20, 8, '#7a5230');
    rect(ctx, x, p.y + sag, 20, 3, '#96683c');
  }
  ctx.strokeStyle = '#5a3b24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = p.x; x <= p.x + p.w; x += 10) {
    const sag = Math.sin((x - p.x) / p.w * Math.PI) * 10;
    ctx.lineTo(x, p.y - 14 + sag * 0.6);
  }
  ctx.stroke();
}

function drawWater(ctx, camX, t, x0, x1) {
  if (x1 < camX || x0 > camX + CFG.W) return;
  rect(ctx, x0, 500, x1 - x0, 40, '#0e2c4f');
  ctx.fillStyle = '#2f6ea8';
  for (let x = x0; x < x1; x += 16) {
    const yy = 502 + Math.sin(t * 3 + x * 0.09) * 3;
    ctx.fillRect(x, yy, 10, 3);
  }
}
