// ===================== Boss 6：火山泰坦（冲锋 / 熔岩弹 / 砸地震波） =====================
import { CFG } from './config.js';
import { rand, clamp } from './utils.js';
import { rect } from './utils.js';
import { Assets, drawSprite } from './assets.js';
import { ebSpeed } from './enemies.js';
import { BaseBoss } from './bossbase.js';

const G = CFG.GROUND_Y;
const ARENA_LEFT_PAD = 660;

export class TitanBoss extends BaseBoss {
  constructor() {
    super();
    this.w = 100;
    this.h = 112;
    this.x = CFG.ARENA_WALL_X - 280;
    this.y = G - this.h;
    this.vx = 0;
    this.facing = -1;
    // core = 头部熔核（全额）；身体命中减半
    this.core = { x: this.x + 50, y: this.y + 18, r: 22, hp: 150, max: 150 };
    this.clearText = '泰坦已崩解';
    this.title = '火山泰坦';
    this.state = 'idle';   // idle / charge / lob / slam
    this.timer = 1.2;
    this.lobN = 0;
    this.walkT = 0;
    this.roared = false;
    this.killScore = 14000;
    this.dyingBoomInterval = 0.1;
    this.dyingDuration = 2.1;
  }

  dyingBoomPos() {
    return { x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), s: rand(0.9, 1.6) };
  }

  finalBoomPos() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  scorePos() { return { x: this.x + this.w / 2, y: this.y + 36 }; }

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

    if (this.phase2 && !this.roared) {
      this.roared = true;
      audio.sfx('roar');
      world.shake(10);
      particles.text(this.x + 50, this.y - 18, '狂暴!!', '#ff6a50');
    }

    this.facing = px < this.x + this.w / 2 ? -1 : 1;
    const dist = Math.abs(px - (this.x + this.w / 2));
    const cd = this.phase2 ? 0.62 : 1;

    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        this.walkT += dt;
        this.x += this.facing * (this.phase2 ? 48 : 32) * dt;
        this.clampArena();
        if (this.timer <= 0 && !player.dead) {
          if (dist > 280) this.startCharge();
          else if (dist > 140) this.startLob();
          else { this.state = 'slam'; this.timer = 0.32; }
        }
        break;
      }
      case 'charge': {
        this.x += this.facing * (this.phase2 ? 520 : 400) * dt;
        this.clampArena();
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'slam';
          this.timer = 0.28;
        }
        break;
      }
      case 'lob': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.fireMagma(world, px, py);
          this.lobN--;
          if (this.lobN > 0) this.timer = this.phase2 ? 0.32 : 0.42;
          else {
            if (this.phase2) this.rainMeteors(world, px);
            this.state = 'idle';
            this.timer = rand(0.9, 1.4) * cd;
          }
        }
        break;
      }
      case 'slam': {
        this.timer -= dt;
        if (this.timer <= 0) {
          const wv = ebSpeed(this.phase2 ? 340 : 280);
          enemies.bullets.push({ x: this.x + 10, y: G - 6, vx: -wv, vy: 0, r: 12, kind: 'wave', life: 2.4 });
          enemies.bullets.push({ x: this.x + this.w - 10, y: G - 6, vx: wv, vy: 0, r: 12, kind: 'wave', life: 2.4 });
          audio.sfx('boom');
          world.shake(12);
          particles.explosion(this.x + this.w / 2, G - 10, 0.95);
          this.state = 'idle';
          this.timer = rand(0.8, 1.3) * cd;
        }
        break;
      }
    }
    this.core.x = this.x + (this.facing < 0 ? 32 : this.w - 32);
    this.core.y = this.y + 18;
  }

  startCharge() {
    this.state = 'charge';
    this.timer = 0.55;
  }

  startLob() {
    this.state = 'lob';
    this.lobN = this.phase2 ? 3 : 2;
    this.timer = 0.22;
  }

  fireMagma(world, px, py) {
    const { enemies, audio } = world;
    const cx = this.x + this.w / 2 + this.facing * 36;
    const cy = this.y + 28;
    const dx = px - cx;
    const T = rand(0.95, 1.35);
    const g = 980;
    enemies.bullets.push({
      x: cx, y: cy,
      vx: dx / T + rand(-40, 40),
      vy: (py - cy - 0.5 * g * T * T) / T,
      r: 8, grav: g, kind: 'magma',
    });
    audio.sfx('eshoot');
  }

  rainMeteors(world, px) {
    const { enemies } = world;
    const n = 3;
    for (let i = 0; i < n; i++) {
      enemies.bullets.push({
        x: px + rand(-120, 120) + (i - 1) * 70,
        y: 30 + i * 18,
        vx: this.facing * 40,
        vy: 260 + i * 30,
        r: 9, kind: 'magma', life: 3.2,
      });
    }
  }

  clampArena() {
    this.x = clamp(this.x, CFG.ARENA_WALL_X - ARENA_LEFT_PAD, CFG.ARENA_WALL_X - this.w - 16);
  }

  // 命中检测：头部熔核 'core'（全额）/ 身体 'body'（减半）；始终在场可打
  hitTest(b) {
    if (this.dead) return null;
    const c = this.core;
    const dx = b.x - c.x, dy = b.y - c.y;
    if (dx * dx + dy * dy <= (c.r + 4) * (c.r + 4)) return 'core';
    if (b.x > this.x && b.x < this.x + this.w && b.y > this.y && b.y < this.y + this.h) return 'body';
    return null;
  }

  draw(ctx, time) {
    if (this.done) return;
    if (this.dead && Math.floor(time * 10) % 2) return;
    const img = Assets.get('titan');
    const step = this.state === 'idle' ? Math.sin(this.walkT * 5) * 2 : this.state === 'charge' ? 4 : 0;
    if (img) {
      drawSprite(ctx, img, this.x - 16, this.y - 8 + step * 0.4, this.w + 32, this.h + 8,
        { flip: this.facing > 0, scale: this.flash > 0 ? 1.04 : 1 });
    } else {
      const x = this.x, y = this.y + step * 0.4;
      const rock = this.flash > 0 ? '#8a7060' : '#3a2a26';
      const magma = this.phase2 ? '#ff6a28' : '#e8552a';
      // 腿
      rect(ctx, x + 14, y + 72, 24, 40, rock);
      rect(ctx, x + 62, y + 72, 24, 40, rock);
      rect(ctx, x + 10, y + 104, 32, 8, '#2a1c18');
      rect(ctx, x + 58, y + 104, 32, 8, '#2a1c18');
      // 躯干
      rect(ctx, x + 8, y + 28, 84, 52, rock);
      rect(ctx, x + 8, y + 28, 84, 6, '#5a4038');
      // 熔岩裂纹
      ctx.fillStyle = magma;
      ctx.fillRect(x + 22, y + 40, 4, 28);
      ctx.fillRect(x + 48, y + 36, 3, 34);
      ctx.fillRect(x + 72, y + 44, 4, 22);
      // 胸口熔核（弱点）
      const pulse = 0.65 + Math.sin(time * 6) * 0.35;
      ctx.fillStyle = `rgba(255,140,40,${0.35 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y + step * 0.4, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = magma;
      ctx.beginPath();
      ctx.arc(this.core.x, this.core.y + step * 0.4, 10, 0, Math.PI * 2);
      ctx.fill();
      // 头
      const hx = this.facing < 0 ? x + 18 : x + 54;
      rect(ctx, hx, y + 4, 28, 26, rock);
      rect(ctx, hx + (this.facing < 0 ? 4 : 12), y + 12, 12, 6, magma);
      // 肩甲
      rect(ctx, x - 4, y + 24, 20, 22, '#2e201c');
      rect(ctx, x + 84, y + 24, 20, 22, '#2e201c');
    }
    if (this.phase2 && !this.dead) {
      ctx.fillStyle = 'rgba(255,90,30,0.55)';
      for (let i = 0; i < 5; i++) {
        const a = time * 4 + i * 1.26;
        ctx.fillRect(this.x + this.w / 2 + Math.cos(a) * 58, this.y + 50 + Math.sin(a) * 40, 3, 3);
      }
    }
  }
}
