// ===================== Boss 5：熔岩巨兽（潜没无敌 ↔ 浮出输出窗口） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { LEVEL } from './level.js';
import { BaseBoss } from './bossbase.js';

const G = CFG.GROUND_Y;
const POOL_W = 460;        // 岩浆池宽
const POOL_WALL_GAP = 30;  // 池右缘距 Boss 墙左缘

export class LavaBeast extends BaseBoss {
  constructor() {
    super();
    this.w = 110;
    this.h = 118;
    // 岩浆池几何从关卡数据派生：池右缘 = 墙左缘 - 30，池宽 460
    const wallX = LEVEL.wallX ?? CFG.ARENA_WALL_X;
    this.poolX1 = wallX - POOL_WALL_GAP;
    this.poolX0 = this.poolX1 - POOL_W;
    this.spots = [this.poolX0 + 80, this.poolX0 + 230, this.poolX0 + 380];   // 三个浮出点（均布池内）
    this.spot = 1;
    this.x = this.spots[1] - this.w / 2;
    this.y = G + 60;                    // 潜没在岩浆下
    this.facing = -1;
    // core = 头部（浮出时才是弱点）
    this.core = { x: this.x + 40, y: G + 120, r: 30, hp: 140, max: 140 };
    this.clearText = '巨兽已讨伐';
    this.title = '熔岩巨兽';
    this.state = 'hidden';   // hidden / rise / attack / submerge
    this.timer = 1.6;
    this.volleyT = 0;
    this.geysers = [];       // 二阶段岩浆喷泉 {x, warn, active}
    this.geyserT = 2.5;
    this.killScore = 12000;
    this.dyingBoomInterval = 0.12;
    this.dyingDuration = 2.0;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), s: rand(0.9, 1.5) };
  }

  // 缓缓沉入岩浆
  dyingTick(dt, world) { this.y += 16 * dt; }

  finalBoomPos() { return { x: this.x + this.w / 2, y: G - 30 }; }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 30 }; }

  get vulnerable() { return this.state === 'rise' || this.state === 'attack' || this.state === 'submerge'; }

  update(dt, world) {
    if (this.done) return;
    const { player, enemies, particles, audio } = world;
    const px = player.x + CFG.PLAYER_W / 2;
    const py = player.y + player.h / 2;
    this.flash = Math.max(0, this.flash - dt);

    if (this.dead) {
      this.updateDying(dt, world);
      return;
    }

    // 岩浆池致死：玩家脚底落在池面附近且横坐标在池范围内（尊重无敌/防护罩）
    if (!player.dead && player.inv <= 0 && player.shieldT <= 0) {
      const pcx = player.x + player.w / 2;
      const feet = player.y + player.h;
      if (pcx > this.poolX0 && pcx < this.poolX1 && feet > G - 10 && feet < G + 40) {
        world.killPlayer();
      }
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;

    switch (this.state) {
      case 'hidden': {
        this.timer -= dt;
        if (this.timer <= 0 && !player.dead) {
          // 选离玩家较近但不完全贴脸的浮出点
          let best = 0, bd = Infinity;
          this.spots.forEach((sx, i) => {
            const d = Math.abs(px - sx);
            if (d < bd) { bd = d; best = i; }
          });
          this.spot = Math.random() < 0.65 ? best : Math.floor(Math.random() * 3);
          this.x = this.spots[this.spot] - this.w / 2;
          this.state = 'rise';
          this.timer = 0.55;
          audio.sfx('roar');
          world.shake(8);
        }
        break;
      }
      case 'rise': {
        this.y = Math.max(G - this.h, this.y - 260 * dt);
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'attack';
          this.timer = this.phase2 ? 3.8 : 3.0;
          this.volleyT = 0.4;
          this.geyserT = 1.2;
        }
        break;
      }
      case 'attack': {
        this.timer -= dt;
        // 喷火球（抛物线连发）
        this.volleyT -= dt;
        if (this.volleyT <= 0 && !player.dead) {
          const n = this.phase2 ? 5 : 3;
          const cx = this.x + this.w / 2 + this.facing * 30;
          const cy = this.y + 26;
          for (let i = 0; i < n; i++) {
            const T = rand(0.9, 1.4), g = 950;
            const dx = px - cx + rand(-160, 160);
            enemies.bullets.push({
              x: cx, y: cy,
              vx: dx / T,
              vy: (py - cy - 0.5 * g * T * T) / T,
              r: 8, grav: g, kind: 'fire',
            });
          }
          audio.sfx('launch');
          this.volleyT = this.phase2 ? 0.95 : 1.2;
        }
        // 二阶段：岩浆喷泉（预警柱 → 喷发）
        if (this.phase2) {
          this.geyserT -= dt;
          if (this.geyserT <= 0) {
            const gx = clamp(px + rand(-120, 120), this.poolX0 - 300, this.poolX0 - 60);
            this.geysers.push({ x: gx, warn: 0.7, active: 0.45, fired: false });
            this.geyserT = rand(1.6, 2.2);
          }
        }
        if (this.timer <= 0) {
          this.state = 'submerge';
          this.timer = 0.6;
        }
        break;
      }
      case 'submerge': {
        this.y = Math.min(G + 60, this.y + 260 * dt);
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'hidden';
          this.timer = this.phase2 ? 1.3 : 2.1;
        }
        break;
      }
    }

    // 喷泉更新（独立于状态，喷发伤害靠子弹）
    for (const gz of this.geysers) {
      if (gz.warn > 0) {
        gz.warn -= dt;
      } else {
        if (!gz.fired) {
          gz.fired = true;
          for (const off of [-40, 0, 40]) {
            enemies.bullets.push({ x: gz.x + off * 0.3, y: G - 6, vx: off, vy: -560, r: 10, grav: 900, kind: 'fire' });
          }
          world.audio.sfx('boom');
          world.shake(5);
          world.particles.explosion(gz.x, G - 10, 0.7);
        }
        gz.active -= dt;
      }
    }
    this.geysers = this.geysers.filter((gz) => gz.warn > 0 || gz.active > 0);

    // 弱点位置（头部）
    this.core.x = this.x + (this.facing < 0 ? 36 : this.w - 36);
    this.core.y = this.y + 26;
    if (!this.vulnerable) this.core.y = G + 200;   // 潜没时弱点沉入浆下（追踪弹打不到）
  }

  // 命中检测：只有浮出时才能被击中，damage 用基类实现（killScore=12000）
  hitTest(b) {
    if (this.dead || !this.vulnerable) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    if (b.x > this.x && b.x < this.x + this.w && b.y > this.y + 40 && b.y < G) return 'body';
    return null;
  }

  draw(ctx, time) {
    // 岩浆池（始终绘制，Boss 的"家"）
    const grad = ctx.createLinearGradient(0, G - 8, 0, G + 40);
    grad.addColorStop(0, '#ff8a2a');
    grad.addColorStop(0.5, '#e8552a');
    grad.addColorStop(1, '#8c1f08');
    ctx.fillStyle = grad;
    ctx.fillRect(this.poolX0, G - 6, this.poolX1 - this.poolX0, 46);
    // 岩浆表面气泡
    ctx.fillStyle = '#ffc46b';
    for (let i = 0; i < 8; i++) {
      const bx = this.poolX0 + 20 + ((i * 57 + time * 26) % (this.poolX1 - this.poolX0 - 40));
      const by = G - 2 + Math.sin(time * 3 + i) * 2;
      ctx.fillRect(bx, by, 6, 3);
    }
    // 池边岩石
    rect(ctx, this.poolX0 - 16, G - 10, 16, 50, '#3c3026');
    rect(ctx, this.poolX1, G - 10, 16, 50, '#3c3026');

    // 喷泉预警柱
    for (const gz of this.geysers) {
      if (gz.warn > 0 && Math.floor(time * 10) % 2) {
        ctx.fillStyle = 'rgba(255,120,40,0.5)';
        ctx.fillRect(gz.x - 8, G - 120, 16, 120);
      }
    }

    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;

    const img = Assets.get('lavabeast');
    if (this.state !== 'hidden') {
      if (img) {
        // 岩浆光辉
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,120,40,0.16)';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + 50, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        drawSprite(ctx, img, this.x - 20, this.y - 8, this.w + 40, this.h + 8,
          { flip: this.facing > 0, scale: this.flash > 0 ? 1.05 : 1 });
      } else {
        // ---- 代码手绘回退：熔岩巨兽 ----
        const x = this.x, y = this.y;
        const rock = this.flash > 0 ? '#6a5a50' : '#3c3026';
        // 躯干（黑岩 + 熔岩裂纹）
        rect(ctx, x + 8, y + 30, 94, 88, rock);
        rect(ctx, x + 20, y + 44, 8, 60, '#e8552a');
        rect(ctx, x + 56, y + 36, 6, 50, '#ff8a2a');
        rect(ctx, x + 78, y + 52, 8, 56, '#e8552a');
        // 手臂
        rect(ctx, x - 10, y + 44, 20, 60, rock);
        rect(ctx, x + 100, y + 44, 20, 60, rock);
        rect(ctx, x - 10, y + 96, 20, 10, '#e8552a');
        rect(ctx, x + 100, y + 96, 20, 10, '#e8552a');
        // 头（角 + 火眼）
        rect(ctx, x + 26, y - 2, 58, 36, rock);
        rect(ctx, x + 20, y - 14, 12, 16, '#2c221a');
        rect(ctx, x + 78, y - 14, 12, 16, '#2c221a');
        const ex = this.facing < 0 ? 34 : 62;
        rect(ctx, x + ex, y + 10, 10, 6, '#ffb830');
        // 熔岩巨口
        rect(ctx, x + 38, y + 24, 34, 8, '#e8552a');
        rect(ctx, x + 42, y + 24, 6, 10, '#ffc46b');
        rect(ctx, x + 62, y + 24, 6, 10, '#ffc46b');
      }
    } else if (!this.dead) {
      // 潜没中：岩浆面涟漪提示位置
      const rx = this.spots[this.spot];
      ctx.strokeStyle = 'rgba(255,196,107,0.7)';
      ctx.lineWidth = 2;
      const rr = 12 + Math.sin(time * 4) * 5;
      ctx.beginPath();
      ctx.arc(rx, G - 2, rr, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
}
