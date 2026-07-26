// ===================== HUD & 各状态界面 =====================
import { CFG, WEAPONS } from './config.js';
import { rect, text, bigText } from './utils.js';
import { drawBackground, LEVEL } from './level.js';
import { Assets } from './assets.js';

const pad = (n, w = 6) => String(Math.floor(n)).padStart(w, '0');

export function drawHUD(ctx, game) {
  // 顶栏
  text(ctx, `SCORE ${pad(game.score)}`, 16, 12, { size: 20, color: '#ffe95a' });
  text(ctx, `HI ${pad(game.hi)}`, CFG.W / 2, 12, { size: 20, color: '#8ad0ff', align: 'center' });
  // 命数（≤5 画小头盔图标，更多时显示 ×N）
  text(ctx, 'LIVES', CFG.W - 170, 12, { size: 16, color: '#fff' });
  const drawHelmet = (x) => {
    rect(ctx, x, 12, 8, 7, '#f0c090');
    rect(ctx, x - 1, 10, 10, 4, '#2c5a34');
  };
  if (game.player.lives <= 5) {
    for (let i = 0; i < game.player.lives; i++) drawHelmet(CFG.W - 105 + i * 11);
  } else {
    drawHelmet(CFG.W - 105);
    text(ctx, `× ${game.player.lives}`, CFG.W - 90, 11, { size: 18, color: '#ffe95a' });
  }
  // 武器（徽章图标 + 名称）
  const w = WEAPONS[game.player.weapon];
  rect(ctx, 14, CFG.H - 40, 170, 28, 'rgba(0,0,0,0.45)');
  const emblem = Assets.get(`emblem_${game.player.weapon}`);
  if (emblem) ctx.drawImage(emblem, 18, CFG.H - 38, 24, 24);
  text(ctx, `${game.player.weapon}·${w.name}`, 48, CFG.H - 34, { size: 16, color: game.player.weapon === 'R' ? '#ccc' : '#6aff8a' });
  // 防护罩剩余时间
  if (game.player.shieldT > 0) {
    const star = Assets.get('emblem_B');
    if (star) ctx.drawImage(star, 192, CFG.H - 38, 24, 24);
    text(ctx, `${game.player.shieldT.toFixed(0)}s`, 220, CFG.H - 34, { size: 16, color: '#7ad0ff' });
  }
  // 静音提示
  if (game.audio.muted) text(ctx, '静音[M]', CFG.W - 16, CFG.H - 34, { size: 14, color: '#999', align: 'right' });

  // Boss 血条
  if (game.boss && !game.boss.done) {
    const c = game.boss.core;
    rect(ctx, CFG.W / 2 - 200, CFG.H - 34, 400, 16, 'rgba(0,0,0,0.55)');
    rect(ctx, CFG.W / 2 - 196, CFG.H - 30, 392 * Math.max(0, c.hp / c.max), 8, '#e03a28');
    text(ctx, 'BOSS', CFG.W / 2 - 244, CFG.H - 34, { size: 18, color: '#ff6a50' });
  }

  // Boss 登场警告（含 Boss 名）
  if (game.bossBanner > 0 && Math.floor(game.bossBanner * 6) % 2) {
    bigText(ctx, '!! WARNING !!', CFG.W / 2, 140, 44, '#ff4030');
    if (game.boss?.title) bigText(ctx, game.boss.title, CFG.W / 2, 190, 24, '#ffb830');
  }
}

// 关卡名开场横幅（淡出）
export function drawStageBanner(ctx, name, t) {
  const alpha = Math.min(1, t / 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(8,6,16,0.55)';
  ctx.fillRect(0, 210, CFG.W, 84);
  rect(ctx, 0, 210, CFG.W, 3, '#ffb830');
  rect(ctx, 0, 291, CFG.W, 3, '#ffb830');
  bigText(ctx, name, CFG.W / 2, 252, 36, '#ffe95a');
  ctx.restore();
}

export function drawTitle(ctx, t, konami, sel) {
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
    'F 射击      X / 空格 跳跃',
    'ENTER 开始 / 暂停    M 静音',
    '按 9 = 30 条命（金手指）',
  ];
  lines.forEach((l, i) => text(ctx, l, CFG.W / 2, 320 + i * 26, { size: 18, color: '#cfe0ff', align: 'center' }));

  if (konami) {
    bigText(ctx, '30 LIVES !!', CFG.W / 2, 290, 26, '#6aff8a');
  }

  // 选关（2x2 网格布局，适配多关）
  if (sel) {
    const { levels, levelIdx, unlocked } = sel;
    levels.forEach((lv, i) => {
      const locked = i > unlocked;
      const cur = i === levelIdx;
      const label = locked ? `${lv.name} 🔒` : lv.name;
      const color = locked ? '#5a6070' : cur ? '#ffe95a' : '#8a94a8';
      const col = i % 3, row = Math.floor(i / 3);
      text(ctx, `${cur && !locked ? '▶ ' : ''}${label}${cur && !locked ? ' ◀' : ''}`,
        CFG.W / 2 + (col - 1) * 200, 424 + row * 24, { size: 17, color, align: 'center' });
    });
    if (Math.floor(t * 2) % 2) {
      text(ctx, '← → 选关    ↑ ↓ 难度    ENTER 开始', CFG.W / 2, 424 + Math.ceil(levels.length / 3) * 24 + 4, { size: 16, color: '#ffffff', align: 'center' });
    }
    if (sel.diffName) {
      text(ctx, `难度：${sel.diffName}`, CFG.W / 2 + 200, 424 + Math.ceil(levels.length / 3) * 24 + 4, { size: 16, color: '#6aff8a', align: 'left' });
    }
  } else if (Math.floor(t * 2) % 2) {
    bigText(ctx, '按 ENTER 开始', CFG.W / 2, 450, 26, '#ffffff');
  }
  ctx.fillStyle = 'rgba(10,5,20,0.55)';
  ctx.fillRect(CFG.W / 2 - 250, 492, 500, 26);
  text(ctx, '无人机补给：M机枪 S散弹 L激光 G榴弹 H导弹 F火焰', CFG.W / 2, 498, { size: 14, color: '#ffe95a', align: 'center' });
}

export function drawPause(ctx, game) {
  ctx.fillStyle = 'rgba(0,0,10,0.55)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  bigText(ctx, 'PAUSED', CFG.W / 2, CFG.H / 2 - 60, 48, '#8ad0ff');
  bigText(ctx, LEVEL.name, CFG.W / 2, CFG.H / 2 - 10, 22, '#ffe95a');
  if (game?.stats) {
    const acc = game.stats.shots > 0 ? Math.round((game.stats.hits / game.stats.shots) * 100) : 0;
    text(ctx, `击杀 ${game.stats.kills}    命中率 ${acc}%    死亡 ${game.stats.deaths}`,
      CFG.W / 2, CFG.H / 2 + 26, { size: 16, color: '#cfe0ff', align: 'center' });
  }
  bigText(ctx, '按 ENTER 继续', CFG.W / 2, CFG.H / 2 + 70, 22, '#fff');
}

export function drawGameOver(ctx, score, hi) {
  ctx.fillStyle = 'rgba(20,0,0,0.72)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  bigText(ctx, 'GAME OVER', CFG.W / 2, 200, 56, '#ff4030');
  text(ctx, `SCORE ${pad(score)}`, CFG.W / 2, 300, { size: 24, color: '#ffe95a', align: 'center' });
  text(ctx, `HI     ${pad(hi)}`, CFG.W / 2, 334, { size: 24, color: '#8ad0ff', align: 'center' });
  bigText(ctx, '按 ENTER 返回标题', CFG.W / 2, 420, 22, '#fff');
}

export function drawVictory(ctx, score, time, hasNext = false, clearText = '要塞已摧毁', stats = null) {
  ctx.fillStyle = 'rgba(0,16,8,0.72)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  bigText(ctx, 'MISSION CLEAR!', CFG.W / 2, 160, 52, '#6aff8a');
  bigText(ctx, clearText, CFG.W / 2, 218, 28, '#ffe95a');
  text(ctx, `SCORE ${pad(score)}`, CFG.W / 2, 280, { size: 24, color: '#ffe95a', align: 'center' });
  if (stats) {
    const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
    text(ctx, `击杀 ${stats.kills}      命中率 ${acc}%`, CFG.W / 2, 322, { size: 18, color: '#cfe0ff', align: 'center' });
    text(ctx, `时间 ${time.toFixed(1)}s      死亡 ${stats.deaths}`, CFG.W / 2, 352, { size: 18, color: '#cfe0ff', align: 'center' });
  } else {
    text(ctx, `TIME  ${time.toFixed(1)}s`, CFG.W / 2, 322, { size: 20, color: '#cfe0ff', align: 'center' });
  }
  if (hasNext) {
    bigText(ctx, '按 ENTER 进入下一关', CFG.W / 2, 430, 22, '#6aff8a');
  } else {
    bigText(ctx, '全部通关！按 ENTER 返回标题', CFG.W / 2, 430, 22, '#fff');
  }
}
