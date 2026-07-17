// ===================== HUD & 各状态界面 =====================
import { CFG, WEAPONS } from './config.js';
import { rect, text, bigText } from './utils.js';
import { drawBackground } from './level.js';

const pad = (n, w = 6) => String(Math.floor(n)).padStart(w, '0');

export function drawHUD(ctx, game) {
  // 顶栏
  text(ctx, `SCORE ${pad(game.score)}`, 16, 12, { size: 20, color: '#ffe95a' });
  text(ctx, `HI ${pad(game.hi)}`, CFG.W / 2, 12, { size: 20, color: '#8ad0ff', align: 'center' });
  // 命数（小头盔图标）
  text(ctx, 'LIVES', CFG.W - 170, 12, { size: 16, color: '#fff' });
  for (let i = 0; i < Math.min(game.player.lives, 10); i++) {
    const x = CFG.W - 105 + i * 11;
    rect(ctx, x, 12, 8, 7, '#f0c090');
    rect(ctx, x - 1, 10, 10, 4, '#2c5a34');
  }
  if (game.player.lives > 10) text(ctx, `+${game.player.lives - 10}`, CFG.W - 14, 12, { size: 14, color: '#fff', align: 'right' });
  // 武器
  const w = WEAPONS[game.player.weapon];
  rect(ctx, 14, CFG.H - 40, 150, 28, 'rgba(0,0,0,0.45)');
  text(ctx, `武器 ${game.player.weapon}·${w.name}`, 22, CFG.H - 34, { size: 16, color: game.player.weapon === 'R' ? '#ccc' : '#6aff8a' });
  // 静音提示
  if (game.audio.muted) text(ctx, '静音[M]', CFG.W - 16, CFG.H - 34, { size: 14, color: '#999', align: 'right' });

  // Boss 血条
  if (game.boss && !game.boss.done) {
    const c = game.boss.core;
    rect(ctx, CFG.W / 2 - 200, CFG.H - 34, 400, 16, 'rgba(0,0,0,0.55)');
    rect(ctx, CFG.W / 2 - 196, CFG.H - 30, 392 * Math.max(0, c.hp / c.max), 8, '#e03a28');
    text(ctx, 'BOSS', CFG.W / 2 - 244, CFG.H - 34, { size: 18, color: '#ff6a50' });
  }

  // Boss 登场警告
  if (game.bossBanner > 0 && Math.floor(game.bossBanner * 6) % 2) {
    bigText(ctx, '!! WARNING !!', CFG.W / 2, 140, 44, '#ff4030');
  }
}

export function drawTitle(ctx, t, konami) {
  drawBackground(ctx, t * 60, t);
  // 标题
  bigText(ctx, 'STEEL ASSAULT', CFG.W / 2, 150, 64, '#ffb830', '#4a1800');
  bigText(ctx, '钢 铁 突 击', CFG.W / 2, 215, 40, '#ffe95a', '#4a1800');
  text(ctx, '— 类魂斗罗 · 横版突突突 —', CFG.W / 2, 258, { size: 16, color: '#d0b8ff', align: 'center' });

  // 操作说明（半透明底板保证可读性）
  ctx.fillStyle = 'rgba(10,5,20,0.55)';
  ctx.fillRect(CFG.W / 2 - 260, 300, 520, 120);
  const lines = [
    '← → 移动    ↑ / ↓ 瞄准 / 蹲下',
    'Z 射击      X / 空格 跳跃',
    'ENTER 开始 / 暂停    M 静音',
  ];
  lines.forEach((l, i) => text(ctx, l, CFG.W / 2, 320 + i * 26, { size: 18, color: '#cfe0ff', align: 'center' }));

  if (konami) {
    bigText(ctx, '30 LIVES !!', CFG.W / 2, 290, 26, '#6aff8a');
  }

  if (Math.floor(t * 2) % 2) {
    bigText(ctx, '按 ENTER 开始', CFG.W / 2, 450, 26, '#ffffff');
  }
  ctx.fillStyle = 'rgba(10,5,20,0.55)';
  ctx.fillRect(CFG.W / 2 - 250, 492, 500, 26);
  text(ctx, '打落无人机补给箱可获得 M 机枪 / S 散弹', CFG.W / 2, 498, { size: 14, color: '#ffe95a', align: 'center' });
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(0,0,10,0.55)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  bigText(ctx, 'PAUSED', CFG.W / 2, CFG.H / 2 - 20, 48, '#8ad0ff');
  bigText(ctx, '按 ENTER 继续', CFG.W / 2, CFG.H / 2 + 40, 22, '#fff');
}

export function drawGameOver(ctx, score, hi) {
  ctx.fillStyle = 'rgba(20,0,0,0.72)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  bigText(ctx, 'GAME OVER', CFG.W / 2, 200, 56, '#ff4030');
  text(ctx, `SCORE ${pad(score)}`, CFG.W / 2, 300, { size: 24, color: '#ffe95a', align: 'center' });
  text(ctx, `HI     ${pad(hi)}`, CFG.W / 2, 334, { size: 24, color: '#8ad0ff', align: 'center' });
  bigText(ctx, '按 ENTER 返回标题', CFG.W / 2, 420, 22, '#fff');
}

export function drawVictory(ctx, score, time) {
  ctx.fillStyle = 'rgba(0,16,8,0.72)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  bigText(ctx, 'MISSION CLEAR!', CFG.W / 2, 180, 52, '#6aff8a');
  bigText(ctx, '要塞已摧毁', CFG.W / 2, 240, 28, '#ffe95a');
  text(ctx, `SCORE ${pad(score)}`, CFG.W / 2, 310, { size: 24, color: '#ffe95a', align: 'center' });
  text(ctx, `TIME  ${time.toFixed(1)}s`, CFG.W / 2, 344, { size: 20, color: '#cfe0ff', align: 'center' });
  bigText(ctx, '按 ENTER 返回标题', CFG.W / 2, 430, 22, '#fff');
}
